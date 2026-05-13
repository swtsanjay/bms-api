import type { Knex } from 'knex';

const NEXT_USER_TYPES = [
    'EMPLOYEE',
    'COMPANY',
    'ADMIN',
    'VENDOR',
    'FABRIC_SUPPLIER',
    'CHECKER',
    'SALES_MAN',
    'CUSTOMER',
] as const;

const PREVIOUS_USER_TYPES = [
    'EMPLOYEE',
    'COMPANY',
    'ADMIN',
    'VENDOR',
    'FABRIC_SUPPLIER',
    'CHECKER',
    'SALES_MAN',
] as const;

export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        ALTER TABLE users
        MODIFY COLUMN user_type ENUM('${NEXT_USER_TYPES.join("','")}')
        NOT NULL DEFAULT 'EMPLOYEE'
    `);

    await knex.schema.alterTable('users', function (table) {
        table.string('business_type', 150).nullable().after('company_name');
        table.text('profile_notes').nullable().after('business_type');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('users', function (table) {
        table.dropColumn('profile_notes');
        table.dropColumn('business_type');
    });

    await knex.raw(`
        UPDATE users
        SET user_type = 'VENDOR'
        WHERE user_type = 'CUSTOMER'
    `);

    await knex.raw(`
        ALTER TABLE users
        MODIFY COLUMN user_type ENUM('${PREVIOUS_USER_TYPES.join("','")}')
        NOT NULL DEFAULT 'EMPLOYEE'
    `);
}
