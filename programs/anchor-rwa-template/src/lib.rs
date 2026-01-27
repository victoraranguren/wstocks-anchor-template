use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
        Metadata as Metaplex,
    },
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};

declare_id!("jEXgKE9NWJihHqLVAoXZ4e2TSZ7KkV7kub8j4ojcmZC");

#[program]
pub mod anchor_rwa_template {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn initialize_asset(
        ctx: Context<InitializeAsset>,
        id: u64,
        asset_symbol: String,
        asset_isin: String,
        legal_doc_uri: String,
        asset_type: AssetType,
        metadata: InitTokenParams,
    ) -> Result<()> {
        //1. Create registry
        let asset_registry = &mut ctx.accounts.asset_registry;
        let timestamp = Clock::get()?.unix_timestamp;

        asset_registry.id = id;

        asset_registry.authority = ctx.accounts.owner.key();
        asset_registry.mint = ctx.accounts.mint.key();

        asset_registry.asset_symbol = asset_symbol;
        asset_registry.asset_isin = asset_isin;
        asset_registry.legal_doc_uri = legal_doc_uri;

        asset_registry.creation_date = timestamp;

        asset_registry.asset_type = asset_type;
        asset_registry.bump = ctx.bumps.asset_registry;

        let id_bytes = id.to_le_bytes();
        //2. Create token
        let seeds = &["mint".as_bytes(), id_bytes.as_ref(), &[ctx.bumps.mint]];
        let signer = [&seeds[..]];

        let token_data: DataV2 = DataV2 {
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadata.uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        let metadata_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                payer: ctx.accounts.owner.to_account_info(),
                update_authority: ctx.accounts.owner.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                metadata: ctx.accounts.metadata.to_account_info(),
                mint_authority: ctx.accounts.owner.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            &signer,
        );

        create_metadata_accounts_v3(metadata_ctx, token_data, false, true, None)?;

        msg!("Token mint created successfully.");
        Ok(())
    }

    pub fn mint_asset(
        ctx: Context<MintAsset>,
        amount_tokens: u64, 
    ) -> Result<()> {
        require!(amount_tokens > 0, MyError::AmountTooSmall);

        let total_tokens = amount_tokens * 10u64.pow(ctx.accounts.mint.decimals as u32);
        let id_bytes = ctx.accounts.asset_registry.id.to_le_bytes();
        let seeds = &["mint".as_bytes(), id_bytes.as_ref(), &[ctx.bumps.mint]];
        let signer = [&seeds[..]];

        //1. Mint tokens to the owner's wallet
        let mint_tokens_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.destiny_asset_token_account.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
            &signer,
        );

        mint_to(mint_tokens_ctx, total_tokens)?;

        msg!("Tokens minted successfully.");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
#[instruction(
    id: u64,
)]
pub struct InitializeAsset<'info> {
    #[account(init, payer = owner, space = AssetRegistry::INIT_SPACE, seeds = [b"asset_registry", owner.key().as_ref(), id.to_le_bytes().as_ref()], bump)]
    pub asset_registry: Account<'info, AssetRegistry>,
    #[account(init,
        payer = owner,
        seeds = [b"mint", id.to_le_bytes().as_ref()],
        bump,
        mint::decimals = 8, mint::authority = owner, mint::freeze_authority = owner
    )]
    pub mint: Account<'info, Mint>,
    /// CHECK: New Metaplex Account being created
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub token_metadata_program: Program<'info, Metaplex>,

    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintAsset<'info> {
    #[account(
        mut,
        seeds = [b"asset_registry", owner.key().as_ref(), asset_registry.id.to_le_bytes().as_ref()],
        bump = asset_registry.bump
    )]
    pub asset_registry: Account<'info, AssetRegistry>,
    #[account(
        mut,
        seeds = [b"mint", asset_registry.id.to_le_bytes().as_ref()],
        bump,
    )]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK
    pub destiny: SystemAccount<'info>,
    #[account(
        init_if_needed, 
        payer = owner,
        associated_token::mint = mint,
        associated_token::authority = destiny
    )]
    pub destiny_asset_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    pub rent: Sysvar<'info, Rent>,
}

#[account]
#[derive(InitSpace)]
pub struct AssetRegistry {
    pub id: u64,

    pub authority: Pubkey,
    pub mint: Pubkey,

    #[max_len(10)]
    pub asset_symbol: String,
    #[max_len(16)]
    pub asset_isin: String,
    #[max_len(200)]
    pub legal_doc_uri: String,
    pub creation_date: i64,

    pub asset_type: AssetType,

    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum AssetType {
    Equity,
    Debt,
    RealEstate,
    Commodity,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct InitTokenParams {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
}

#[error_code]
pub enum MyError {
    #[msg("El monto debe ser mayor a cero.")]
    AmountTooSmall,
}