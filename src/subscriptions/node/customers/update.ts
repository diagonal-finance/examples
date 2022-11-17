import { Diagonal, Customer, UpdateCustomer } from '@diagonal-finance/sdk'

export const updateCustomer = async (
  diagonal: Diagonal,
  diagonalCustomerId: string,
  newCustomerEmail: string,
): Promise<Customer> => {
  const input: UpdateCustomer = {
    email: newCustomerEmail,
  }
  const updatedCustomer = await diagonal.customers.update(
    diagonalCustomerId,
    input,
  )
  return updatedCustomer
}
