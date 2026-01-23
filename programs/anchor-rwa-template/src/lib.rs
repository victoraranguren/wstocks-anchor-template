use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

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
        asset_symbol: String,
        asset_isin: String,
        legal_doc_uri: String,
        asset_type: AssetType,
    ) -> Result<()> {
        let asset_registry = &mut ctx.accounts.asset_registry;
        let timestamp = Clock::get()?.unix_timestamp;
        asset_registry.authority = ctx.accounts.owner.key();
        asset_registry.mint = ctx.accounts.mint.key();

        asset_registry.asset_symbol = asset_symbol;
        asset_registry.asset_isin = asset_isin;
        asset_registry.legal_doc_uri = legal_doc_uri;

        asset_registry.creation_date = timestamp;

        asset_registry.asset_type = asset_type;
        asset_registry.bump = ctx.bumps.asset_registry;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct InitializeAsset<'info> {
    #[account(init, payer = owner, space = AssetRegistry::INIT_SPACE, seeds = [b"asset_registry", owner.key().as_ref()], bump)]
    pub asset_registry: Account<'info, AssetRegistry>,
    #[account(init, payer = owner, mint::decimals = 8, mint::authority = owner, mint::freeze_authority = owner)]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,

    pub rent: Sysvar<'info, Rent>,
}

#[account]
#[derive(InitSpace)]
pub struct AssetRegistry {
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
