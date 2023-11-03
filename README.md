This is a sample contract that utilizes [ERC-3668](https://eips.ethereum.org/EIPS/eip-3668) to retrieve data from an off-chain source.

The project comprises a backend that validates a claim and generates a unique `tokenId`. The contract returns the `tokenId` for a claim and, if desired, mints an NFT in a single transaction.

```shell
yarn test
npx hardhat run scripts/deploy.ts --network goerli
npx hardhat verify --network goerli <address> --contract contracts/NFT.sol:NFT
```

* Tests: `test/NFT.ts` 
* Example CCIP Reading process: `example/ethers-call.js`
* Contract: `contracts/NFT.sol`
* Cloudflare-Worker of the HTTP Resolver: `server-worker/src/worker.ts`

```mermaid
sequenceDiagram
    participant Client
    participant Contract
    participant Backend
    note over Client, Backend: verify claim
    Client->>Contract: resolveClaim(claimId)
    Contract-->>Client: revert OffchainLookup (contract, urls, claimId, resolveClaimRemote.selector, extraData)
    Client->>Backend: { sender, claimId }
    Backend-->>Client: signed response
    Client->>Contract: resolveClaimRemote(response, extraData)
    alt response signer is not allowed
        Contract-->>Client: revert
    end
    Contract-->>Client: claimable tokenId

    note over Client, Contract: claim token
    Client->>Contract: claim(response, extraData)
    alt response signer is not allowed or token already minted
        Contract-->>Client: revert
    end
    Contract-->>Client: mint token
```

- Example Deployment: [`0xBf159FBA384CA8CD4888C82cDd264ce1a16aDE46`](https://goerli.etherscan.io/address/0xBf159FBA384CA8CD4888C82cDd264ce1a16aDE46)
- Worker: https://server-worker.cloudflare3563.workers.dev