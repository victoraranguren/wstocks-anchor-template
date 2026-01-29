# wStocks – Anchor RWA Program

Programa Anchor del ecosistema **wStocks** para registrar activos del mundo real (RWA) y emitir su token SPL asociado en Solana.

## Intro

Este repositorio contiene el **Solana Program** (programa on-chain) principal de **wStocks**, que complementa al frontend `wStocks` (`wstocks-frontend-template`). Desde el punto de vista funcional, define el registro on-chain de activos y las operaciones para crear y mintear el token SPL asociado que luego consume el frontend.

- Repositorio GitHub (programa Anchor): https://github.com/victoraranguren/wstocks-anchor-template
- Frontend wStocks (DApp): https://github.com/victoraranguren/wstocks-frontend-template

La lógica principal es:

1. Crear un **registro on-chain** del activo (Asset Registry) con su información legal y de negocio.
2. Derivar y crear el **mint SPL** asociado a ese activo.
3. Permitir **mintear más supply** del token hacia cuentas destino autorizadas.
4. Opcionalmente, **cerrar** el registro del activo.

## Tech stack

- **Rust + Anchor** para el programa on-chain.
- **anchor_spl** para integraciones con:
  - SPL Token (mint, cuentas asociadas).
  - Metaplex Token Metadata (metadata del mint).
- **TypeScript** para tests y cliente JS generado.
- **Codama** para generar el cliente TypeScript (`dist/js-client`).

## Requisitos previos

- Rust y toolchain de Anchor instalados (ver `[toolchain]` y `[provider]` en `Anchor.toml`).
- Solana CLI instalada y configurada con una keypair (`~/.config/solana/id.json`).
- Node.js >= 18 y `yarn` / `pnpm` / `npm` para ejecutar scripts de tooling y pruebas.

## Instalación

1. Clona el repositorio del programa Anchor:
   ```bash path=null start=null
   git clone https://github.com/victoraranguren/wstocks-anchor-template.git
   cd wstocks-anchor-template
   ```
2. Instala dependencias JS (para tests, Codama, etc.):
   ```bash path=null start=null
   pnpm install
   # o
   yarn install
   # o
   npm install
   ```

## Scripts habituales

Desde la raíz del proyecto:

- **Lint** (Prettier sobre JS/TS):
  ```bash path=null start=null
  pnpm lint
  ```
- **Lint + autofix**:
  ```bash path=null start=null
  pnpm lint:fix
  ```
- **Tests Anchor (ts-mocha)**, usando el script definido en `Anchor.toml`:
  ```bash path=null start=null
  anchor test
  ```

Asegúrate de tener el `cluster` configurado (por defecto `Localnet` en `Anchor.toml`).

## Arquitectura del código

La solución se divide en tres piezas principales:

- **Programa Anchor (on-chain)**
- **Cliente TypeScript generado (Codama)**
- **Tests de integración Anchor (ts-mocha)**

### Programa Anchor (`programs/anchor-rwa-template/src/lib.rs`)

El módulo `anchor_rwa_template` define las instrucciones y cuentas principales:

- **Instrucciones**
  - `initialize`:
    - Simple instrucción de saludo/bootstrapping, útil para verificar despliegues.
  - `initialize_asset`:
    - Crea y rellena la cuenta `AssetRegistry` (registro on-chain del activo).
    - Deriva y crea el **mint SPL** asociado usando una PDA con seed `"mint"` + `id`.
    - Crea la cuenta de **metadata de Metaplex** (`Metadata`) usando `create_metadata_accounts_v3`.
  - `mint_asset`:
    - Mintea una cantidad adicional de tokens SPL hacia una cuenta de destino asociada (ATA).
    - Valida que `amount_tokens > 0` y convierte la cantidad a base 10 en función de los `decimals` del mint.
  - `close_asset`:
    - Cierra la cuenta del registro (`AssetRegistry`) y envía el lamports restante al `owner`.

- **Cuentas**
  - `AssetRegistry`:
    - Cuenta de datos que representa un activo on-chain.
    - Campos principales:
      - `id: u64` — identificador único del asset.
      - `authority: Pubkey` — autoridad/proprietario del registro.
      - `mint: Pubkey` — mint SPL asociado al activo.
      - `asset_symbol: String` — símbolo corto (ej. `WTSLA`).
      - `asset_name: String` — nombre legible del activo.
      - `asset_isin: String` — identificador tipo ISIN / código interno.
      - `legal_doc_uri: String` — enlace al documento legal del activo.
      - `creation_date: i64` — timestamp Unix de creación.
      - `asset_type: AssetType` — tipo de activo (equity, debt, etc.).
      - `bump: u8` — bump de la PDA.
  - `AssetType` (enum):
    - `Equity`
    - `Debt`
    - `RealEstate`
    - `Commodity`
  - `InitTokenParams` (struct):
    - `name: String` — nombre del token SPL.
    - `symbol: String` — símbolo del token SPL.
    - `uri: String` — URI de metadata (JSON on-chain/off-chain).
    - `decimals: u8` — decimales del mint.

- **Lógica de negocio principal**

  **1. Registro del activo (`initialize_asset`)**

  - Se crea una cuenta `AssetRegistry` con seeds:
    - `b"asset_registry"`, `owner.key()`, `id.to_le_bytes()`.
  - Se rellena con los datos de negocio y legales del activo.
  - A partir de `id` se derivan seeds para el mint SPL:
    - `b"mint"`, `id.to_le_bytes()`.
  - Se crea el mint SPL con:
    - `mint::decimals = 8` (en el código actual).
    - `mint::authority = owner` y `mint::freeze_authority = owner`.
  - Se construye la metadata de Metaplex (`DataV2`) con los campos de `InitTokenParams` y se invoca `create_metadata_accounts_v3` vía CPI.

  Resultado: tras esta instrucción tienes **un asset registrado on-chain** + **un mint SPL con su metadata** listo para ser usado por el frontend.

  **2. Mint de tokens (`mint_asset`)**

  - A partir de `asset_registry.id` se recalculan las seeds del mint SPL (`b"mint" + id`).
  - Se deriva/crea si hace falta la cuenta asociada (ATA) de destino (`destiny_asset_token_account`) usando `AssociatedToken`.
  - Se calcula el total de tokens a mintear:
    - `total_tokens = amount_tokens * 10^decimals`.
  - Se ejecuta un CPI a `token::mint_to` firmando con las seeds del mint PDA.

  Resultado: se incrementa el **supply circulante** del token SPL asociado al asset y se asigna a la cuenta destino indicada.

  **3. Cierre del asset (`close_asset`)**

  - `close_asset` marca la cuenta `AssetRegistry` para ser cerrada, enviando los lamports remanentes al `owner`.
  - Es útil para limpiar registros que ya no se usarán.

### Cliente TypeScript (`dist/js-client`)

El cliente TypeScript es generado automáticamente con **Codama** y expone helpers tipados para integrarse fácilmente desde el frontend o scripts Node:

- `dist/js-client/accounts/assetRegistry.ts`:
  - Tipos y codecs para decodificar/encodificar la cuenta `AssetRegistry`.
  - Helpers como `fetchAssetRegistry`, `fetchAllAssetRegistry`, etc.
- `dist/js-client/instructions/initializeAsset.ts`:
  - Tipos `InitializeAssetInstruction*`.
  - Encoders/decoders de datos de la instrucción.
  - Funciones `getInitializeAssetInstruction` y `getInitializeAssetInstructionAsync` para construir instrucciones listas para usarse con `@solana/kit`.
- `dist/js-client/instructions/mintAsset.ts`:
  - Tipos y helpers análogos para la instrucción de mint.
- `dist/js-client/types/assetType.ts`:
  - Enum `AssetType` y codecs asociados.

Este cliente es el que consume el frontend `wStocks` (`wstocks-frontend-template`) para leer registros y disparar transacciones.

### Tests (`tests/anchor-rwa-template.ts`)

Los tests están escritos en TypeScript usando **Anchor + ts-mocha**:

- Configuran el provider con `AnchorProvider.env()` y usan el workspace `AnchorRwaTemplate`.
- Incluyen ejemplos (algunos comentados) de:
  - Inicializar un asset (`initialize_asset`), imprimir PDAs y cuentas.
  - Consultar `program.account.assetRegistry.fetch` y `.all()`.
  - Mintear tokens adicionales a una cuenta de destino (`mint_asset`).
  - (Comentado) Cerrar una cuenta de asset (`close_asset`).

Sirven como referencia práctica de cómo interactuar con el programa desde un entorno de pruebas.

## Flujo de negocio end-to-end

1. **Frontend** llama a `initialize_asset` usando el cliente JS:
   - El usuario rellena datos del activo (nombre, símbolo, ISIN, legalDocUri, tipo) y del token SPL (nombre, símbolo, uri, decimales).
   - Se envía una transacción firmada por el `owner`.
2. **Programa Anchor**:
   - Crea `AssetRegistry` + mint SPL + metadata de Metaplex.
3. **Frontend** lee los registros (`AssetRegistry`) y los muestra (tabla/cards).
4. Cuando se requiere más supply:
   - El frontend dispara `mint_asset` apuntando a una `destiny` pública.
   - El programa mintea tokens hacia la ATA de esa `destiny`.

Con este flujo se modela el ciclo de vida completo de un RWA tokenizado: creación del registro legal/on-chain, creación del mint y emisión de tokens.

## Contribuir

1. Crea una rama desde `main` (o la rama de desarrollo que estés usando).
2. Implementa tus cambios en el programa Anchor, cliente generado o tests.
3. Ejecuta `anchor test` y `pnpm lint` antes de abrir el PR.
4. Abre un Pull Request describiendo claramente el cambio funcional y cualquier migración de datos necesaria.

## Licencia

Pendiente de definir o actualizar según las necesidades del proyecto.
