import { CreateCustomer, Customer, Diagonal } from '@diagonal-finance/sdk'

export const createCustomer = async (
  diagonal: Diagonal,
  customerName: string,
  customerEmail: string,
): Promise<Customer> => {
  const input: CreateCustomer = {
    email: customerEmail,
    name: customerName,
  }

  const customer = await diagonal.customers.create(input)
  return customer
}
