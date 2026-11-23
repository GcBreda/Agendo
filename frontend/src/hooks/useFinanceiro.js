// frontend/src/hooks/useFinanceiro.js
// Resumo financeiro do profissional logado, usando React Query
import { useQuery } from '@tanstack/react-query'
import { financeiroService } from '../services/api'

// ── Totais de cada mês de um ano (o servidor faz as contas) ──
export function useResumoFinanceiro(ano) {
  return useQuery({
    queryKey: ['resumo-financeiro', ano],
    queryFn: async () => {
      const { data } = await financeiroService.resumo(ano)
      return data
    }
  })
}
