extern crate alloc;

// Modules and imports
mod erc721;

/// Import the Stylus SDK along with alloy primitive types for use in our program.
use stylus_sdk::{
    abi::Bytes,
    call::Call,
    contract,
    evm,
    msg,
    prelude::*,
    alloy_primitives::{Address, U256}
};
use alloy_sol_types::sol;
use crate::erc721::{Erc721, Erc721Params};

// Interfaces for the Art contract and the ERC20 contract
sol_interface! {
    interface NftArt {
        function initialize(address token_contract_address) external;
        function generateArt(uint256 token_id, address owner) external returns(string);
    }
}

struct RobinhoodNFTParams;

/// Immutable definitions
impl Erc721Params for RobinhoodNFTParams {
    const NAME: &'static str = "RobinhoodNFT";
    const SYMBOL: &'static str = "RHNFT";
}

// Define the entrypoint as a Solidity storage object. The sol_storage! macro
// will generate Rust-equivalent structs with all fields mapped to Solidity-equivalent
// storage slots and types.
sol_storage! {
    #[entrypoint]
    struct RobinhoodNFT {
        /// The address that deployed/owns the contract
        address owner;
        /// Whether the contract has been initialized
        bool initialized;
        /// Whether the contract is paused (emergency stop)
        bool paused;
        /// Maximum number of NFTs that can be minted (0 = unlimited)
        uint256 max_supply;
        /// Address of companion art contract
        address art_contract_address;

        #[borrow] // Allows erc721 to access MyToken's storage and make calls
        Erc721<RobinhoodNFTParams> erc721;
    }
}

// Declare Solidity error types
sol! {
    /// Contract has already been initialized
    error AlreadyInitialized();
    /// A call to an external contract failed
    error ExternalCallFailed();
    /// Caller is not the owner of the contract
    error NotOwner(address caller, address owner);
    /// New owner cannot be the zero address
    error ZeroAddressOwner();
    /// Contract is paused
    error ContractPaused();
    /// Max supply has been reached, no more NFTs can be minted
    error MaxSupplyReached(uint256 max_supply);

    /// Emitted when ownership is transferred
    event OwnershipTransferred(address indexed previous_owner, address indexed new_owner);
    /// Emitted when the contract is paused
    event Paused(address account);
    /// Emitted when the contract is unpaused
    event Unpaused(address account);
}

/// Represents the ways methods may fail.
#[derive(SolidityError)]
pub enum RobinhoodNFTError {
    AlreadyInitialized(AlreadyInitialized),
    ExternalCallFailed(ExternalCallFailed),
    NotOwner(NotOwner),
    ZeroAddressOwner(ZeroAddressOwner),
    ContractPaused(ContractPaused),
    MaxSupplyReached(MaxSupplyReached),
}

// Internal helper methods (not exposed to other contracts)
impl RobinhoodNFT {
    /// Checks that the caller is the contract owner. Returns an error if not.
    fn only_owner(&self) -> Result<(), Vec<u8>> {
        let owner = self.owner.get();
        if msg::sender() != owner {
            return Err(RobinhoodNFTError::NotOwner(NotOwner {
                caller: msg::sender(),
                owner,
            }).into());
        }
        Ok(())
    }

    /// Checks that the contract is not paused. Returns an error if it is.
    fn when_not_paused(&self) -> Result<(), Vec<u8>> {
        if self.paused.get() {
            return Err(RobinhoodNFTError::ContractPaused(ContractPaused {}).into());
        }
        Ok(())
    }

    /// Checks that minting won't exceed the max supply cap.
    /// If max_supply is 0, minting is unlimited.
    fn check_supply(&self) -> Result<(), Vec<u8>> {
        let max = self.max_supply.get();
        if max > U256::ZERO && self.erc721.total_supply.get() >= max {
            return Err(RobinhoodNFTError::MaxSupplyReached(MaxSupplyReached {
                max_supply: max,
            }).into());
        }
        Ok(())
    }
}

#[public]
#[inherit(Erc721<RobinhoodNFTParams>)]
impl RobinhoodNFT {
    /// Initializes the contract, setting the caller as the owner.
    /// `max_supply`: maximum NFTs that can ever be minted (0 = unlimited).
    /// Can only be called once.
    pub fn initialize(&mut self, max_supply: U256) -> Result<(), Vec<u8>> {
        if self.initialized.get() {
            return Err(RobinhoodNFTError::AlreadyInitialized(AlreadyInitialized {}).into());
        }
        self.initialized.set(true);
        self.owner.set(msg::sender());
        self.max_supply.set(max_supply);

        evm::log(OwnershipTransferred {
            previous_owner: Address::default(),
            new_owner: msg::sender(),
        });

        Ok(())
    }

    /// Returns the current owner of the contract
    pub fn get_owner(&self) -> Result<Address, Vec<u8>> {
        Ok(self.owner.get())
    }

    /// Returns the maximum number of NFTs that can be minted (0 = unlimited)
    pub fn get_max_supply(&self) -> Result<U256, Vec<u8>> {
        Ok(self.max_supply.get())
    }

    /// Mints an NFT to the caller. Only the owner can call this. Reverts if paused or max supply reached.
    pub fn mint(&mut self) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;
        self.only_owner()?;
        self.check_supply()?;
        let minter = msg::sender();
        self.erc721.mint(minter)?;
        Ok(())
    }

    /// Mints an NFT to the specified address. Only the owner can call this. Reverts if paused or max supply reached.
    pub fn mint_to(&mut self, to: Address) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;
        self.only_owner()?;
        self.check_supply()?;
        self.erc721.mint(to)?;
        Ok(())
    }

    /// Mints an NFT safely (calls onERC721Received). Only the owner can call this. Reverts if paused or max supply reached.
    pub fn safe_mint(&mut self, to: Address) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;
        self.only_owner()?;
        self.check_supply()?;
        Erc721::safe_mint(self, to, Vec::new())?;
        Ok(())
    }

    /// Burns an NFT. Any holder can burn their own NFTs. Reverts if paused.
    pub fn burn(&mut self, token_id: U256) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;
        self.erc721.burn(msg::sender(), token_id)?;
        Ok(())
    }

    /// Transfers an NFT. Reverts if paused.
    /// Overrides the inherited transferFrom to add pause guard.
    pub fn transfer_from(
        &mut self,
        from: Address,
        to: Address,
        token_id: U256,
    ) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;
        self.erc721.transfer_from(from, to, token_id)?;
        Ok(())
    }

    /// Approves an address to manage a specific NFT. Reverts if paused.
    /// Overrides the inherited approve to add pause guard.
    pub fn approve(&mut self, approved: Address, token_id: U256) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;
        self.erc721.approve(approved, token_id)?;
        Ok(())
    }

    /// Sets or revokes operator approval. Reverts if paused.
    /// Overrides the inherited setApprovalForAll to add pause guard.
    pub fn set_approval_for_all(
        &mut self,
        operator: Address,
        approved: bool,
    ) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;
        self.erc721.set_approval_for_all(operator, approved)?;
        Ok(())
    }

    /// Returns whether the contract is currently paused.
    pub fn paused(&self) -> Result<bool, Vec<u8>> {
        Ok(self.paused.get())
    }

    /// Pauses the contract. Only the owner can call this.
    /// When paused, all transfers, mints, burns, and approvals are blocked.
    pub fn pause(&mut self) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        self.paused.set(true);
        evm::log(Paused {
            account: msg::sender(),
        });
        Ok(())
    }

    /// Unpauses the contract. Only the owner can call this.
    pub fn unpause(&mut self) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        self.paused.set(false);
        evm::log(Unpaused {
            account: msg::sender(),
        });
        Ok(())
    }

    /// Transfers ownership of the contract to a new address. Only the current owner can call this.
    pub fn transfer_ownership(&mut self, new_owner: Address) -> Result<(), Vec<u8>> {
        self.only_owner()?;

        if new_owner.is_zero() {
            return Err(RobinhoodNFTError::ZeroAddressOwner(ZeroAddressOwner {}).into());
        }

        let previous_owner = self.owner.get();
        self.owner.set(new_owner);

        evm::log(OwnershipTransferred {
            previous_owner,
            new_owner,
        });

        Ok(())
    }

    /// Sets the base URI for token metadata. Only the owner can call this.
    /// Example: set_base_uri("https://api.example.com/metadata/")
    /// Then tokenURI(42) will return "https://api.example.com/metadata/42"
    pub fn set_base_uri(&mut self, base_uri: String) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        self.erc721.set_base_uri_internal(base_uri);
        Ok(())
    }

    /// Returns the current base URI for token metadata.
    pub fn get_base_uri(&self) -> Result<String, Vec<u8>> {
        Ok(self.erc721.base_uri().map_err(|e| -> Vec<u8> { e.into() })?)
    }
}