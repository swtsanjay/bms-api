import crypto from 'crypto';
import config from '../config';

export function clearSearch(obj: Record<string, any>) {
	for (const [key, value] of Object.entries(obj)) {
		if (value === undefined) {
			delete obj[key];
		} else if (typeof value === 'object' && value !== null) {
			clearSearch(value);
		} else if (typeof value === 'string' && value.length === 0) {
			delete obj[key];
		}
	}
}

export function encryptData(text: string): string {
	let iv = crypto.randomBytes(config.crypto.ivLength);
	let cipher = crypto.createCipheriv(config.crypto.algorithm, config.crypto.encryptionKey, iv);
	let encrypted = cipher.update(text);
	encrypted = Buffer.concat([encrypted, cipher.final()]);
	return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptData(text: string) {
	try {
		let textParts: string[] = text.split(':');

		if (textParts.length === 0) {
			throw new Error('textParts is empty, cannot shift');
		}
		const ivString = textParts.shift();
		if (!ivString || typeof ivString !== 'string') {
			throw new Error('Invalid or missing IV string');
		}
		let iv = Buffer.from(ivString, 'hex');
		let encryptedText = Buffer.from(textParts.join(':'), 'hex');
		let decipher = crypto.createDecipheriv(config.crypto.algorithm, config.crypto.encryptionKey, iv);
		let decrypted = decipher.update(encryptedText);
		decrypted = Buffer.concat([decrypted, decipher.final()]);
		return decrypted.toString();
	} catch (error) {
		console.error('Error decrypting data:', error);
		return null;
	}
}