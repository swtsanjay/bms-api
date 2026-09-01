import { CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import knex from 'knex';
import knexConfig from '../config/knex';
import config from '../config';

function publicUrl(bucket: string, key: string) {
    return `https://${bucket}.s3.${config.aws.region}.amazonaws.com/${key.split('/').map(encodeURIComponent).join('/')}`;
}

async function main() {
    if (!config.aws.s3BucketName) throw new Error('AWS_S3_BUCKET_NAME is required');
    const database = knex(knexConfig);
    const client = new S3Client({
        region: config.aws.region,
        credentials: config.aws.accessKeyId && config.aws.secretAccessKey ? {
            accessKeyId: config.aws.accessKeyId,
            secretAccessKey: config.aws.secretAccessKey
        } : undefined
    });

    try {
        const assets = await database('vsq_media_assets')
            .select('id', 'public_id', 'bucket', 'object_key', 'object_version_id')
            .where('object_key', 'like', '%/commerce/shopify/%')
            .orderBy('id');
        const copied: Array<{ id: number; bucket: string; oldKey: string; oldVersionId: string | null; newKey: string; newVersionId: string | null }> = [];

        for (const asset of assets) {
            const bucket = String(asset.bucket || config.aws.s3BucketName);
            const oldKey = String(asset.object_key);
            const filename = oldKey.slice(oldKey.lastIndexOf('/') + 1);
            const basePrefix = oldKey.slice(0, oldKey.indexOf('/commerce/shopify/'));
            const newKey = `${basePrefix}/commerce/catalog/media/${asset.public_id}/${filename}`;
            const copiedObject = await client.send(new CopyObjectCommand({
                Bucket: bucket,
                Key: newKey,
                CopySource: encodeURIComponent(`${bucket}/${oldKey}`).replace(/%2F/g, '/')
            }));
            await client.send(new HeadObjectCommand({ Bucket: bucket, Key: newKey }));
            copied.push({
                id: Number(asset.id),
                bucket,
                oldKey,
                oldVersionId: asset.object_version_id || null,
                newKey,
                newVersionId: copiedObject.VersionId || null
            });
            if (copied.length % 25 === 0 || copied.length === assets.length) {
                console.log(`Copied ${copied.length}/${assets.length} assets`);
            }
        }

        await database.transaction(async (trx) => {
            for (const asset of copied) {
                await trx('vsq_media_assets').where({ id: asset.id }).update({
                    object_key: asset.newKey,
                    object_version_id: asset.newVersionId,
                    public_url: publicUrl(asset.bucket, asset.newKey),
                    source_url: null,
                    source_system: null,
                    source_id: null,
                    updated_at: new Date()
                });
            }
        });

        for (const [index, asset] of copied.entries()) {
            await client.send(new DeleteObjectCommand({
                Bucket: asset.bucket,
                Key: asset.oldKey,
                VersionId: asset.oldVersionId || undefined
            }));
            if ((index + 1) % 25 === 0 || index + 1 === copied.length) {
                console.log(`Removed ${index + 1}/${copied.length} old assets`);
            }
        }
        console.log(JSON.stringify({ moved: copied.length }));
    } finally {
        await database.destroy();
        client.destroy();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
