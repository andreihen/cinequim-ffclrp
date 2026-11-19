// Lei de velocidade: v = k × [A]^m × [B]^n × ...
// Concentrações em mol/L e velocidade em mol/L/s.
// A unidade de k é (mol/L)^(1 - soma das ordens) / s.
export function produtoConcentracoes(reagentes) {
  if (!Array.isArray(reagentes) || reagentes.length === 0) {
    throw new Error('Informe pelo menos um reagente.');
  }
  return reagentes.reduce((produto, { concentracao, ordem }) => {
    if (!Number.isFinite(concentracao) || concentracao < 0 ||
        !Number.isFinite(ordem) || (concentracao === 0 && ordem < 0)) {
      throw new Error('Concentração ou ordem inválida.');
    }
    return produto * concentracao ** ordem;
  }, 1);
}

export function calcularVelocidade(k, reagentes) {
  if (!Number.isFinite(k) || k <= 0) throw new Error('k deve ser positivo.');
  const velocidade = k * produtoConcentracoes(reagentes);
  if (!Number.isFinite(velocidade)) throw new Error('Resultado fora da faixa numérica.');
  return velocidade;
}

export function determinarK(velocidade, reagentes) {
  const produto = produtoConcentracoes(reagentes);
  const k = velocidade / produto;
  if (!Number.isFinite(velocidade) || velocidade <= 0 ||
      produto <= 0 || !Number.isFinite(produto) || !Number.isFinite(k) || k <= 0) {
    throw new Error('Dados insuficientes ou fora da faixa numérica para determinar k.');
  }
  return k;
}

// Exemplo: v = 0,025 × 0,10^1 × 0,05^2 = 0,00000625 mol/L/s.
const reagentes = [
  { concentracao: 0.10, ordem: 1 },
  { concentracao: 0.05, ordem: 2 },
];
console.log('Velocidade:', calcularVelocidade(0.025, reagentes));
console.log('Constante k:', determinarK(0.00000625, reagentes));
