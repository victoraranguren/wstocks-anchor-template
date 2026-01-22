use anchor_lang::prelude::*;

declare_id!("jEXgKE9NWJihHqLVAoXZ4e2TSZ7KkV7kub8j4ojcmZC");

#[program]
pub mod anchor_rwa_template {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
