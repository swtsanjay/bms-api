import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('user_seller_details');
    
    if (!hasTable) {
        await knex.schema.createTable('user_seller_details', function (table) {
            table.increments('id').unsigned().primary();
            table.integer('user_id').unsigned().notNullable().unique()
                .references('id').inTable('users')
                .onDelete('CASCADE').onUpdate('CASCADE');
            table.string('seller_name', 150).nullable();
            table.string('seller_tagline', 255).nullable();
            table.text('seller_address').nullable();
            table.string('seller_phone', 30).nullable();
            table.string('seller_email', 150).nullable();
            table.string('seller_website', 255).nullable();
            table.string('seller_pan', 30).nullable();
            table.string('seller_gstin', 30).nullable();
            table.string('bank_name', 150).nullable();
            table.string('bank_branch', 150).nullable();
            table.string('bank_account_no', 80).nullable();
            table.string('bank_ifsc', 30).nullable();
            table.string('bank_upi_id', 120).nullable();
            table.string('upi_qr_image_url', 255).nullable();
            table.text('terms_conditions').nullable();
            table.text('declaration').nullable();
            table.string('customer_signature_label', 150).nullable();
            table.string('authorized_signatory_label', 150).nullable();
            table.string('footer_note', 255).nullable();
            table.timestamps(true, true);
            table.index(['user_id'], 'user_seller_details_user_id_idx');
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    if (await knex.schema.hasTable('user_seller_details')) {
        await knex.schema.dropTable('user_seller_details');
    }
}
