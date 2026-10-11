import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('inquiries', (table) => {
        table.integer('assigned_staff_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
        table.index(['assigned_staff_id', 'status'], 'inquiries_assignment_status_idx');
    });
    await knex.schema.alterTable('orders', (table) => {
        table.integer('assigned_staff_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
        // Existing orders are already operational records, never Salesman drafts.
        table.enu('workflow_state', ['DRAFT', 'FINALIZED']).notNullable().defaultTo('FINALIZED');
        table.index(['assigned_staff_id', 'workflow_state'], 'orders_assignment_workflow_idx');
    });
    await knex.schema.alterTable('products', (table) => {
        table.timestamp('archived_at').nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('products', (table) => table.dropColumn('archived_at'));
    await knex.schema.alterTable('orders', (table) => {
        table.dropIndex(['assigned_staff_id', 'workflow_state'], 'orders_assignment_workflow_idx');
        table.dropForeign(['assigned_staff_id']);
        table.dropColumn('assigned_staff_id');
        table.dropColumn('workflow_state');
    });
    await knex.schema.alterTable('inquiries', (table) => {
        table.dropIndex(['assigned_staff_id', 'status'], 'inquiries_assignment_status_idx');
        table.dropForeign(['assigned_staff_id']);
        table.dropColumn('assigned_staff_id');
    });
}
