import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { min } from "bn.js";
import { AnchorRwaTemplate } from "../target/types/anchor_rwa_template";

describe("anchor-rwa-template", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .AnchorRwaTemplate as Program<AnchorRwaTemplate>;
  const wallet = anchor.getProvider().wallet;
  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });

  it("Is AssetRegistry initialized!", async () => {
    const assetRegistry = {
      assetSymbol: "WAAPL",
      assetIsin: "VE-WAAPL-001",
      legalDocUri: "https://www.youtube.com/watch?v=MOl4s-VIuLQ",
      assetType: { equity: {} },
    };
    const mint = anchor.web3.Keypair.generate();
    const [assetRegistryPda, bump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("asset_registry"), wallet.publicKey.toBuffer()],
        program.programId
      );

    console.log("assetRegistry: ", assetRegistry);
    console.log("assetRegistryPda: ", assetRegistryPda);
    console.log("mint: ", mint.publicKey);
    console.log("wallet: ", wallet.publicKey);
    // Add your test here.
    const tx = await program.methods
      .initializeAsset(
        assetRegistry.assetSymbol,
        assetRegistry.assetIsin,
        assetRegistry.legalDocUri,
        assetRegistry.assetType
      )
      .accounts({
        owner: wallet.publicKey,
        assetRegistry: assetRegistryPda,
        mint: mint.publicKey,
      })
      .signers([mint])
      .rpc();
    console.log("Your transaction signature", tx);

    let assetRegistryAccount = await program.account.assetRegistry.fetch(
      assetRegistryPda
    );
    console.log("assetRegistry: ", assetRegistryAccount);
  });
});
