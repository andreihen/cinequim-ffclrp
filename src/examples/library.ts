import { startingInputs, type Experiment } from '../utils/experiments'

export const examples: { title: string; description: string; experiment: Experiment }[] = [
  { title: 'Reação de terceira ordem', description: 'Calcule a velocidade de uma reação de ordem 1 em A e ordem 2 em B.',
    experiment: { module: 'rate', input: startingInputs.rate } },
  { title: 'Método das velocidades iniciais', description: 'Estime as ordens parciais e a constante k a partir de quatro ensaios.',
    experiment: { module: 'experimental', input: startingInputs.experimental } },
  { title: 'Etapas consecutivas', description: 'Acompanhe a formação e o consumo de um intermediário em A → B → C.',
    experiment: { module: 'mechanism', input: startingInputs.mechanism } },
  { title: 'Equilíbrio reversível', description: 'Observe o equilíbrio entre A e B com constantes direta e inversa.',
    experiment: { module: 'mechanism', input: { ...startingInputs.mechanism,
      species: startingInputs.mechanism.species.slice(0, 2),
      steps: [{ reactants: 'A', products: 'B', forward: '0,8', reverse: '0,2', reversible: true }],
    } } },
  { title: 'Decaimento de primeira ordem', description: 'Compare a curva de concentração com a meia-vida da reação.',
    experiment: { module: 'integrated', input: startingInputs.integrated } },
  { title: 'Dependência da temperatura', description: 'Calcule k a partir da energia de ativação e da temperatura absoluta.',
    experiment: { module: 'arrhenius', input: startingInputs.arrhenius } },
  { title: 'Ajuste de Arrhenius', description: 'Determine a energia de ativação e o fator pré-exponencial com quatro medidas.',
    experiment: { module: 'arrhenius', input: { ...startingInputs.arrhenius, mode: 'fit' } } },
]
