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
  // it("Is AssetRegistry initialized!", async () => {
  //   const uniqueId = new BN(Date.now());
  //   const uniqueIdBuffer = uniqueId.toArrayLike(Buffer, "le", 8);
  //   const assetRegistry = {
  //     assetName: "Tesla",
  //     assetSymbol: "TSLA",
  //     assetIsin: "VE-TSLA-002",
  //     legalDocUri:
  //       "https://red-junior-hookworm-237.mypinata.cloud/ipfs/bafkreifhtpftpsozdrox4ihxyfunlrdoflmgpan7ttrgyqnj5vw6ro77ya",
  //     assetType: { equity: {} },
  //   };

  //   const [mint] = anchor.web3.PublicKey.findProgramAddressSync(
  //     [Buffer.from("mint"), uniqueIdBuffer],
  //     program.programId
  //   );

  //   const [assetRegistryPda] = anchor.web3.PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from("asset_registry"),
  //       wallet.publicKey.toBuffer(),
  //       uniqueIdBuffer,
  //     ],
  //     program.programId
  //   );

  //   const METADATA_SEED = "metadata";
  //   const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
  //     "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  //   );
  //   const metadata = {
  //     name: "Tesla Xstocks",
  //     symbol: "WTSLA",
  //     uri: "",
  //     decimals: 8,
  //   };

  //   const [metadataAddress] = anchor.web3.PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from(METADATA_SEED),
  //       TOKEN_METADATA_PROGRAM_ID.toBuffer(),
  //       mint.toBuffer(),
  //     ],
  //     TOKEN_METADATA_PROGRAM_ID
  //   );

  //   const ata = await getAssociatedTokenAddress(mint, wallet.publicKey);

  //   console.log("assetRegistry: ", assetRegistry);
  //   console.log("assetRegistryPda: ", assetRegistryPda);
  //   console.log("mint: ", mint);
  //   console.log("metadata: ", metadataAddress);
  //   console.log("wallet: ", wallet.publicKey);
  //   console.log("ata: ", ata);

  //   const tx = await program.methods
  //     .initializeAsset(
  //       uniqueId,
  //       assetRegistry.assetName,
  //       assetRegistry.assetSymbol,
  //       assetRegistry.assetIsin,
  //       assetRegistry.legalDocUri,
  //       assetRegistry.assetType,
  //       metadata
  //     )
  //     .accounts({
  //       owner: wallet.publicKey,
  //       mint: mint,
  //       metadata: metadataAddress,
  //       assetRegistry: assetRegistryPda,
  //       //ownerAssetTokenAccount: ata,
  //     })
  //     .rpc();

  //   console.log("Your transaction signature", tx);

  //   const assetRegistryAccount = await program.account.assetRegistry.fetch(
  //     assetRegistryPda
  //   );
  //   console.log("assetRegistry: ", assetRegistryAccount);

  //   const assetRegistryAccountAll = await program.account.assetRegistry.all();
  //   console.log("assetRegistry All: ", assetRegistryAccountAll);

  //   // console.log("------------|Minting tokens...|----------");

  //   // const amountTokens = new BN(100);
  //   // const txMint = await program.methods
  //   //   .mintAsset(a
  //   //     amountTokens
  //   //   )
  //   //   .accounts({
  //   //     owner: wallet.publicKey,
  //   //     mint: mint,
  //   //     assetRegistry: assetRegistryPda,
  //   //     ownerAssetTokenAccount: ata,
  //   //   })
  //   //   .rpc();

  //   // console.log("Your mint transaction signature", txMint);
  // });

  it("Increase supply", async () => {
    const assetRegistryPda = new anchor.web3.PublicKey(
      "BRrrNzEf7GFSqunZVgQqpeVB2yjEs7mERaY7JUyUT5vU"
    );
    const assetRegistryAccount = await program.account.assetRegistry.fetch(
      assetRegistryPda
    );
    let [mint] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("mint"),
        new BN(assetRegistryAccount.id).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
    const destiny = new anchor.web3.PublicKey(
      "4Uoi3NxSQbp8dFqumxHxgXzJiEXvN5VvGCtUGTNuwAW6"
    );
    const ata = await getAssociatedTokenAddress(mint, destiny);

    console.log("assetRegistryPda: ", assetRegistryPda);
    console.log("mint: ", mint);
    console.log("wallet: ", wallet.publicKey);
    console.log("destiny: ", destiny);
    console.log("ata: ", ata);

    console.log("assetRegistry: ", assetRegistryAccount);

    const assetRegistryAccountAll = await program.account.assetRegistry.all();
    console.log("assetRegistry All: ", assetRegistryAccountAll[0]);

    console.log("------------|Minting tokens...|----------");

    const amountTokens = new BN(500);
    const txMint = await program.methods
      .mintAsset(amountTokens)
      .accounts({
        owner: wallet.publicKey,
        mint: mint,
        assetRegistry: assetRegistryPda,
        destiny: destiny,
        //destinyAssetTokenAccount: ata,
      })
      .rpc();

    console.log("Your mint transaction signature", txMint);

    [mint] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("mint"),
        new BN(assetRegistryAccount.id).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    console.log("Mint: ", mint);
  });

  // it("Close Account", async () => {
  //   const assetRegistryPda = new anchor.web3.PublicKey(
  //     "Drod5Jt3NgzZaJTTNM8AnumX2LmC3cQsjAiTiGqF2muo"
  //   );
  //   const assetRegistryAccount = await program.account.assetRegistry.fetch(
  //     assetRegistryPda
  //   );
  //   console.log("assetRegistryPda: ", assetRegistryPda);

  //   console.log("assetRegistry: ", assetRegistryAccount);

  //   const assetRegistryAccountAll = await program.account.assetRegistry.all();
  //   console.log("assetRegistry All: ", assetRegistryAccountAll);

  //   console.log("------------|Close Account...|----------");

  //   const txMint = await program.methods
  //     .closeAsset()
  //     .accounts({
  //       owner: wallet.publicKey,
  //       assetRegistry: assetRegistryPda,
  //     })
  //     .rpc();

  //   console.log("Your close transaction signature", txMint);
  // });
});
