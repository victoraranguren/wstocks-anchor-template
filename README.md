# wStocks – Anchor RWA Program

**wStocks** ecosystem Anchor program designed to register Real World Assets (RWA) and issue their associated SPL token on Solana.

## Intro

This repository contains the main **Solana Program** (on-chain program) for **wStocks**, which complements the `wStocks` frontend (`wstocks-frontend-template`). Functionally, it defines the on-chain asset registry and the operations required to create and mint the associated SPL token consumed by the frontend.

* GitHub Repository (Anchor Program): [https://github.com/victoraranguren/wstocks-anchor-template](https://github.com/victoraranguren/wstocks-anchor-template)
* wStocks Frontend (DApp): [https://github.com/victoraranguren/wstocks-frontend-template](https://github.com/victoraranguren/wstocks-frontend-template)

The main logic is as follows:

1. Create an **on-chain asset registry** containing its legal and business information.
2. Derive and create the **SPL mint** associated with that asset.
3. Allow **minting additional supply** of the token to authorized destination accounts.
4. Optionally, **close** the asset registry.

## Tech Stack

* **Rust + Anchor** for the on-chain program.
* **anchor_spl** for integrations with:
* SPL Token (mint, associated accounts).
* Metaplex Token Metadata (mint metadata).


* **TypeScript** for tests and the generated JS client.
* **Codama** to generate the TypeScript client (`dist/js-client`).

## Prerequisites

* Rust and Anchor toolchain installed (see `[toolchain]` and `[provider]` in `Anchor.toml`).
* Solana CLI installed and configured with a keypair (`~/.config/solana/id.json`).
* Node.js >= 18 and `yarn` / `pnpm` / `npm` to run tooling and test scripts.

## Installation

1. Clone the Anchor program repository:
```bash
git clone https://github.com/victoraranguren/wstocks-anchor-template.git
cd wstocks-anchor-template

```


2. Install JS dependencies (for tests, Codama, etc.):
```bash
pnpm install
# or
yarn install
# or
npm install

```



## Common Scripts

From the project root:

* **Lint** (Prettier on JS/TS):
```bash
pnpm lint

```


* **Lint + autofix**:
```bash
pnpm lint:fix

```


* **Anchor Tests (ts-mocha)**, using the script defined in `Anchor.toml`:
```bash
anchor test

```



Ensure you have the `cluster` configured (defaults to `Localnet` in `Anchor.toml`).

## Code Architecture

The solution is divided into three main components:

* **Anchor Program (on-chain)**
* **Generated TypeScript Client (Codama)**
* **Anchor Integration Tests (ts-mocha)**

### Anchor Program (`programs/anchor-rwa-template/src/lib.rs`)

The `anchor_rwa_template` module defines the main instructions and accounts:

* **Instructions**
* `initialize`:
* Simple greeting/bootstrapping instruction, useful for verifying deployments.


* `initialize_asset`:
* Creates and populates the `AssetRegistry` account (on-chain asset registry).
* Derives and creates the associated **SPL mint** using a PDA with seed `"mint"` + `id`.
* Creates the **Metaplex metadata** account (`Metadata`) using `create_metadata_accounts_v3`.


* `mint_asset`:
* Mints an additional amount of SPL tokens to an associated destination account (ATA).
* Validates that `amount_tokens > 0` and converts the amount to base 10 based on the mint's `decimals`.


* `close_asset`:
* Closes the registry account (`AssetRegistry`) and sends the remaining lamports to the `owner`.




* **Accounts**
* `AssetRegistry`:
* Data account representing an on-chain asset.
* Main fields:
* `id: u64` — unique asset identifier.
* `authority: Pubkey` — authority/owner of the registry.
* `mint: Pubkey` — SPL mint associated with the asset.
* `asset_symbol: String` — short symbol (e.g., `WTSLA`).
* `asset_name: String` — readable name of the asset.
* `asset_isin: String` — ISIN identifier / internal code.
* `legal_doc_uri: String` — link to the asset's legal document.
* `creation_date: i64` — Unix timestamp of creation.
* `asset_type: AssetType` — asset type (equity, debt, etc.).
* `bump: u8` — PDA bump.




* `AssetType` (enum):
* `Equity`
* `Debt`
* `RealEstate`
* `Commodity`


* `InitTokenParams` (struct):
* `name: String` — SPL token name.
* `symbol: String` — SPL token symbol.
* `uri: String` — metadata URI (on-chain/off-chain JSON).
* `decimals: u8` — mint decimals.




* **Main Business Logic**
**1. Asset Registration (`initialize_asset`)**
* An `AssetRegistry` account is created with seeds:
* `b"asset_registry"`, `owner.key()`, `id.to_le_bytes()`.


* Populated with business and legal asset data.
* Seeds for the SPL mint are derived from `id`:
* `b"mint"`, `id.to_le_bytes()`.


* The SPL mint is created with:
* `mint::decimals = 8` (in current code).
* `mint::authority = owner` and `mint::freeze_authority = owner`.


* Metaplex metadata (`DataV2`) is constructed with `InitTokenParams` fields and `create_metadata_accounts_v3` is invoked via CPI.


Result: After this instruction, you have **an on-chain registered asset** + **an SPL mint with its metadata** ready to be used by the frontend.
**2. Token Minting (`mint_asset`)**
* SPL mint seeds are recalculated from `asset_registry.id` (`b"mint" + id`).
* The destination associated account (ATA) (`destiny_asset_token_account`) is derived/created if needed using `AssociatedToken`.
* The total tokens to mint is calculated:
* `total_tokens = amount_tokens * 10^decimals`.


* A CPI to `token::mint_to` is executed, signing with the mint PDA seeds.


Result: The **circulating supply** of the SPL token associated with the asset is increased and assigned to the indicated destination account.
**3. Closing the Asset (`close_asset`)**
* `close_asset` marks the `AssetRegistry` account to be closed, sending remaining lamports to the `owner`.
* Useful for cleaning up registries that will no longer be used.



### TypeScript Client (`dist/js-client`)

The TypeScript client is automatically generated with **Codama** and exposes typed helpers to easily integrate from the frontend or Node scripts:

* `dist/js-client/accounts/assetRegistry.ts`:
* Types and codecs to decode/encode the `AssetRegistry` account.
* Helpers like `fetchAssetRegistry`, `fetchAllAssetRegistry`, etc.


* `dist/js-client/instructions/initializeAsset.ts`:
* `InitializeAssetInstruction*` types.
* Encoders/decoders for instruction data.
* Functions `getInitializeAssetInstruction` and `getInitializeAssetInstructionAsync` to build instructions ready to be used with `@solana/kit`.


* `dist/js-client/instructions/mintAsset.ts`:
* Analogous types and helpers for the mint instruction.


* `dist/js-client/types/assetType.ts`:
* `AssetType` enum and associated codecs.



This client is consumed by the `wStocks` frontend (`wstocks-frontend-template`) to read registries and trigger transactions.

### Tests (`tests/anchor-rwa-template.ts`)

Tests are written in TypeScript using **Anchor + ts-mocha**:

* They configure the provider with `AnchorProvider.env()` and use the `AnchorRwaTemplate` workspace.
* Include examples (some commented out) of:
* Initializing an asset (`initialize_asset`), printing PDAs and accounts.
* Querying `program.account.assetRegistry.fetch` and `.all()`.
* Minting additional tokens to a destination account (`mint_asset`).
* (Commented out) Closing an asset account (`close_asset`).



These serve as a practical reference on how to interact with the program from a test environment.

## End-to-End Business Flow

1. **Frontend** calls `initialize_asset` using the JS client:
* The user fills in asset data (name, symbol, ISIN, legalDocUri, type) and SPL token data (name, symbol, uri, decimals).
* A transaction signed by the `owner` is sent.


2. **Anchor Program**:
* Creates `AssetRegistry` + SPL mint + Metaplex metadata.


3. **Frontend** reads the registries (`AssetRegistry`) and displays them (table/cards).
4. When more supply is required:
* The frontend triggers `mint_asset` pointing to a public `destiny`.
* The program mints tokens to that `destiny`'s ATA.



This flow models the full lifecycle of a tokenized RWA: legal/on-chain registry creation, mint creation, and token issuance.

## Contributing

1. Create a branch from `main` (or the development branch you are using).
2. Implement your changes in the Anchor program, generated client, or tests.
3. Run `anchor test` and `pnpm lint` before opening the PR.
4. Open a Pull Request describing clearly the functional change and any necessary data migration.

## License

Pending definition or update according to project needs.
