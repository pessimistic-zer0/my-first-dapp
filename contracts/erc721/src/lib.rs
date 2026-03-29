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

    /// Emitted when ownership is transferred
    event OwnershipTransferred(address indexed previous_owner, address indexed new_owner);
}

/// Represents the ways methods may fail.
#[derive(SolidityError)]
pub enum RobinhoodNFTError {
    AlreadyInitialized(AlreadyInitialized),
    ExternalCallFailed(ExternalCallFailed),
    NotOwner(NotOwner),
    ZeroAddressOwner(ZeroAddressOwner),
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
}

#[public]
#[inherit(Erc721<RobinhoodNFTParams>)]
impl RobinhoodNFT {
    /// Initializes the contract, setting the caller as the owner.
    /// Can only be called once.
    pub fn initialize(&mut self) -> Result<(), Vec<u8>> {
        if self.initialized.get() {
            return Err(RobinhoodNFTError::AlreadyInitialized(AlreadyInitialized {}).into());
        }
        self.initialized.set(true);
        self.owner.set(msg::sender());

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

    /// Mints an NFT to the caller. Only the owner can call this.
    pub fn mint(&mut self) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        let minter = msg::sender();
        self.erc721.mint(minter)?;
        Ok(())
    }

    /// Mints an NFT to the specified address. Only the owner can call this.
    pub fn mint_to(&mut self, to: Address) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        self.erc721.mint(to)?;
        Ok(())
    }

    /// Mints an NFT safely (calls onERC721Received). Only the owner can call this.
    pub fn safe_mint(&mut self, to: Address) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        Erc721::safe_mint(self, to, Vec::new())?;
        Ok(())
    }

    /// Burns an NFT. Any holder can burn their own NFTs.
    pub fn burn(&mut self, token_id: U256) -> Result<(), Vec<u8>> {
        // This function checks that msg::sender() owns the specified token_id
        self.erc721.burn(msg::sender(), token_id)?;
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
}