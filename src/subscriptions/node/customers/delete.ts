import { Diagonal } from '@diagonal-finance/sdk'

export const deleteCustomer = async (
  diagonal: Diagonal,
  diagonalCustomerId: string,
): Promise<void> => {
  await diagonal.customers.delete(diagonalCustomerId)
}
