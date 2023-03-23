/**
 *
 * This represents a fictional Database.
 *
 * It is meant to illustracte the database models potentially required
 * and how would they be interacting accross an integration.
 *
 */

export class Database {
    customer: CustomerTable = new CustomerTable()
}

type Customer = {
    id: string
    name: string
    email: string
    stripeId: string
    stripeSubscriptionId: string | null
    paymentMethodType: 'crypto' | 'fiat' | null
    paymentMethodId: string | null
}

class CustomerTable {
    private table: Customer[] = []

    findById(id: string): Promise<Customer> {
        const index = this.table.findIndex((customer) => customer.id === id)
        if (index === -1) throw new Error('Customer not found')
        return Promise.resolve(this.table[index])
    }
    findByStripeId(stripeId: string): Promise<Customer> {
        const index = this.table.findIndex(
            (customer) => customer.stripeId === stripeId,
        )
        if (index === -1) throw new Error('Customer not found')
        return Promise.resolve(this.table[index])
    }
    create(
        input: Pick<Customer, 'name' | 'email' | 'stripeId'>,
    ): Promise<Customer> {
        const customer: Customer = {
            ...input,
            id: input.stripeId,
            stripeSubscriptionId: null,
            paymentMethodType: null,
            paymentMethodId: null,
        }
        this.table.push(customer)
        return Promise.resolve(customer)
    }
    update(
        id: string,
        input: Partial<Exclude<Customer, 'id'>>,
    ): Promise<Customer> {
        const index = this.table.findIndex((customer) => customer.id === id)
        if (index === -1) throw new Error('Customer not found')
        this.table[index] = { ...this.table[index], ...input }
        return Promise.resolve(this.table[index])
    }
}
