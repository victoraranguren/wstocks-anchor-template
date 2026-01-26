import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BN } from "bn.js";
import { AnchorRwaTemplate } from "../target/types/anchor_rwa_template";
import { getAssociatedTokenAddress } from "@solana/spl-token";

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
    const uniqueId = new BN(Date.now());
    const uniqueIdBuffer = uniqueId.toArrayLike(Buffer, "le", 8);
    const assetRegistry = {
      assetName: "Tesla Xstocks",
      assetSymbol: "WTSLA",
      assetIsin: "VE-WTSLA-002",
      legalDocUri: "https://www.youtube.com/watch?v=MOl4s-VIuLQ",
      assetType: { equity: {} },
    };

    const [mint] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), uniqueIdBuffer],
      program.programId
    );

    const [assetRegistryPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("asset_registry"),
        wallet.publicKey.toBuffer(),
        uniqueIdBuffer,
      ],
      program.programId
    );

    const METADATA_SEED = "metadata";
    const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );
    const metadata = {
      name: assetRegistry.assetName,
      symbol: assetRegistry.assetSymbol,
      uri: "",
      decimals: 8,
    };
    const [metadataAddress] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(METADATA_SEED),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const ata = await getAssociatedTokenAddress(mint, wallet.publicKey);

    console.log("assetRegistry: ", assetRegistry);
    console.log("assetRegistryPda: ", assetRegistryPda);
    console.log("mint: ", mint);
    console.log("metadata: ", metadataAddress);
    console.log("wallet: ", wallet.publicKey);
    console.log("ata: ", ata);
    // Add your test here.
    const tx = await program.methods
      .initializeAsset(
        uniqueId,
        assetRegistry.assetSymbol,
        assetRegistry.assetIsin,
        assetRegistry.legalDocUri,
        assetRegistry.assetType,
        metadata
      )
      .accounts({
        owner: wallet.publicKey,
        mint: mint,
        metadata: metadataAddress,
        assetRegistry: assetRegistryPda,
        ownerAssetTokenAccount: ata,
      })
      .rpc();
    console.log("Your transaction signature", tx);

    const assetRegistryAccount = await program.account.assetRegistry.fetch(
      assetRegistryPda
    );
    console.log("assetRegistry: ", assetRegistryAccount);

    const assetRegistryAccountAll = await program.account.assetRegistry.all();
    console.log("assetRegistry All: ", assetRegistryAccountAll);
  });
});
