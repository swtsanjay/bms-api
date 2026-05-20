export const GET_CUSTOMER_QUERY = `
    query GetCustomer($id: ID!) {
        customer(id: $id) {
            id
            firstName
            lastName
            email
            phone
            createdAt
            updatedAt
            state
            tags
            verifiedEmail
            taxExempt
            note
            defaultAddress {
                id
                firstName
                lastName
                company
                address1
                address2
                city
                province
                country
                zip
                phone
            }
            addresses {
                id
                firstName
                lastName
                company
                address1
                address2
                city
                province
                country
                zip
                phone
            }
            metafields(first: 10) {
                edges {
                    node {
                        namespace
                        key
                        value
                    }
                }
            }
        }
    }
`;
