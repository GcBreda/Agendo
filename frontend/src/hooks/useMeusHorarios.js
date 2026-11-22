// frontend/src/hooks/useMeusHorarios.js
// "Meus horários" do profissional logado, usando React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profissionalService } from '../services/api'

// ── Agenda salva: faixas por dia, duração e intervalo ────────
export function useMeusHorarios() {
  return useQuery({
    queryKey: ['meus-horarios'],
    queryFn: async () => {
      const { data } = await profissionalService.meusHorarios()
      return data
    }
  })
}

// ── Salva a agenda inteira de uma vez ────────────────────────
export function useSalvarMeusHorarios() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dados) => profissionalService.salvarMeusHorarios(dados),
    onSuccess: ({ data }) => {
      // A tela passa a comparar o rascunho com o que acabou de ser salvo
      queryClient.setQueryData(['meus-horarios'], data)
      // Horários livres guardados neste navegador ficaram velhos
      queryClient.invalidateQueries({ queryKey: ['horarios'] })
    }
  })
}
