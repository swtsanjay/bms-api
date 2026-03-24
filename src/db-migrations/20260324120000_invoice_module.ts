import type { Knex } from 'knex';

const userInvoiceColumns: Array<{
    name: string;
    create: (table: Knex.AlterTableBuilder) => void;
}> = [
    { name: 'billing_name', create: (table) => table.string('billing_name', 150).nullable() },
    { name: 'company_name', create: (table) => table.string('company_name', 150).nullable() },
    { name: 'gstin', create: (table) => table.string('gstin', 30).nullable() },
    { name: 'pan_number', create: (table) => table.string('pan_number', 30).nullable() },
    { name: 'billing_email', create: (table) => table.string('billing_email', 150).nullable() },
    { name: 'billing_phone', create: (table) => table.string('billing_phone', 20).nullable() },
    { name: 'billing_address_line1', create: (table) => table.string('billing_address_line1', 255).nullable() },
    { name: 'billing_address_line2', create: (table) => table.string('billing_address_line2', 255).nullable() },
    { name: 'billing_city', create: (table) => table.string('billing_city', 120).nullable() },
    { name: 'billing_state', create: (table) => table.string('billing_state', 120).nullable() },
    { name: 'billing_country', create: (table) => table.string('billing_country', 120).nullable() },
    { name: 'billing_pincode', create: (table) => table.string('billing_pincode', 20).nullable() },
    { name: 'place_of_supply', create: (table) => table.string('place_of_supply', 150).nullable() },
    { name: 'shipping_name', create: (table) => table.string('shipping_name', 150).nullable() },
    { name: 'shipping_phone', create: (table) => table.string('shipping_phone', 20).nullable() },
    { name: 'shipping_address_line1', create: (table) => table.string('shipping_address_line1', 255).nullable() },
    { name: 'shipping_address_line2', create: (table) => table.string('shipping_address_line2', 255).nullable() },
    { name: 'shipping_city', create: (table) => table.string('shipping_city', 120).nullable() },
    { name: 'shipping_state', create: (table) => table.string('shipping_state', 120).nullable() },
    { name: 'shipping_country', create: (table) => table.string('shipping_country', 120).nullable() },
    { name: 'shipping_pincode', create: (table) => table.string('shipping_pincode', 20).nullable() }
];

async function ensureUserInvoiceColumns(knex: Knex) {
    for (const column of userInvoiceColumns) {
        const hasColumn = await knex.schema.hasColumn('users', column.name);
        if (!hasColumn) {
            await knex.schema.alterTable('users', function (table) {
                column.create(table);
            });
        }
    }
}

async function ensureInvoicesTable(knex: Knex) {
    const hasInvoices = await knex.schema.hasTable('invoices');
    if (!hasInvoices) {
        await knex.schema.createTable('invoices', function (table) {
            table.increments('id').unsigned().primary();
            table.integer('client_id').unsigned().notNullable()
                .references('id').inTable('users')
                .onDelete('RESTRICT').onUpdate('CASCADE');
            table.integer('order_id').unsigned().nullable()
                .references('id').inTable('orders')
                .onDelete('SET NULL').onUpdate('CASCADE');
            table.integer('created_by').unsigned().notNullable()
                .references('id').inTable('users')
                .onDelete('RESTRICT').onUpdate('CASCADE');
            table.string('invoice_no', 100).notNullable().unique();
            table.date('invoice_date').notNullable();
            table.string('challan_no', 100).nullable();
            table.date('challan_date').nullable();
            table.string('eway_bill_no', 100).nullable();
            table.string('transport_name', 150).nullable();
            table.string('transport_id', 150).nullable();
            table.string('place_of_supply', 150).nullable();
            table.string('currency', 10).notNullable().defaultTo('INR');
            table.string('seller_name', 150).notNullable();
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
            table.decimal('subtotal', 12, 2).notNullable().defaultTo(0);
            table.decimal('tax_total', 12, 2).notNullable().defaultTo(0);
            table.decimal('discount_total', 12, 2).notNullable().defaultTo(0);
            table.decimal('round_off', 12, 2).notNullable().defaultTo(0);
            table.decimal('total_amount', 12, 2).notNullable().defaultTo(0);
            table.text('amount_in_words').nullable();
            table.text('notes').nullable();
            table.text('terms_conditions').nullable();
            table.text('declaration').nullable();
            table.string('customer_signature_label', 150).nullable();
            table.string('authorized_signatory_label', 150).nullable();
            table.string('footer_note', 255).nullable();
            table.timestamps(true, true);
            table.index(['client_id'], 'invoices_client_id_idx');
            table.index(['order_id'], 'invoices_order_id_idx');
            table.index(['created_by'], 'invoices_created_by_idx');
            table.index(['invoice_date'], 'invoices_invoice_date_idx');
        });
    }
}

async function ensureInvoiceItemsTable(knex: Knex) {
    const hasInvoiceItems = await knex.schema.hasTable('invoice_items');
    if (!hasInvoiceItems) {
        await knex.schema.createTable('invoice_items', function (table) {
            table.increments('id').unsigned().primary();
            table.integer('invoice_id').unsigned().notNullable()
                .references('id').inTable('invoices')
                .onDelete('CASCADE').onUpdate('CASCADE');
            table.integer('product_id').unsigned().nullable()
                .references('id').inTable('products')
                .onDelete('SET NULL').onUpdate('CASCADE');
            table.integer('sort_order').notNullable().defaultTo(1);
            table.string('description', 255).notNullable();
            table.string('hsn_sac', 50).nullable();
            table.decimal('quantity', 12, 2).notNullable().defaultTo(1);
            table.string('unit', 30).notNullable().defaultTo('NOS');
            table.decimal('rate', 12, 2).notNullable().defaultTo(0);
            table.decimal('taxable_value', 12, 2).notNullable().defaultTo(0);
            table.decimal('tax_rate', 5, 2).notNullable().defaultTo(0);
            table.decimal('tax_amount', 12, 2).notNullable().defaultTo(0);
            table.decimal('line_total', 12, 2).notNullable().defaultTo(0);
            table.timestamps(true, true);
            table.index(['invoice_id'], 'invoice_items_invoice_id_idx');
            table.index(['product_id'], 'invoice_items_product_id_idx');
        });
    }
}

export async function up(knex: Knex): Promise<void> {
    await ensureUserInvoiceColumns(knex);
    await ensureInvoicesTable(knex);
    await ensureInvoiceItemsTable(knex);
}

export async function down(knex: Knex): Promise<void> {
    if (await knex.schema.hasTable('invoice_items')) {
        await knex.schema.dropTable('invoice_items');
    }
    if (await knex.schema.hasTable('invoices')) {
        await knex.schema.dropTable('invoices');
    }
}
