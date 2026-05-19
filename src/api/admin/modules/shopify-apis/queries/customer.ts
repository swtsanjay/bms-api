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
