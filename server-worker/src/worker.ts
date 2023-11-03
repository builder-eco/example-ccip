import { ethers } from 'ethers'

export interface Env {
	SIGNER_PRIVATE_KEY: string
}


export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const signer = new ethers.utils.SigningKey(env.SIGNER_PRIVATE_KEY);
		const { sender, data: claimId } = await request.json() as { sender: string, data: string }

		// do some magic to verify claimId and respond with data
		// this example calculates a claimId * 2 tokenId as an example
		const tokenId = parseInt(claimId, 16) * 2
		const tokenIdBytes = ethers.utils.defaultAbiCoder.encode(['bytes'], [Number(tokenId)])

		const validUntil = Math.floor(Date.now() / 1000 + 900)
		const messageHash = ethers.utils.solidityKeccak256(
			["bytes", "address", "uint64", "bytes32", "bytes32"],
			[
				"0x1900",
				sender,
				validUntil,
				ethers.utils.keccak256('0x'),
				ethers.utils.keccak256(tokenIdBytes),
			]
		);

		const sig = signer.signDigest(messageHash);
		const sigData = ethers.utils.hexConcat([sig.r, sig.s, ethers.utils.hexlify(sig.v)])

		const resolvedData = ethers.utils.defaultAbiCoder.encode(['bytes', 'uint64', 'bytes'], [tokenIdBytes, validUntil, sigData])
		console.log('Response', JSON.stringify({ sender, claimId, resolvedData }, null, 2))
		return new Response(JSON.stringify({ data: resolvedData }))
	}
};
