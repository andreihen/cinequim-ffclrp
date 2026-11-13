export function numberFrom(value: string, label: string, min = -Infinity, max = Infinity) {
  const normalized = value.trim().replace(',', '.')
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) {
    throw new Error(label + ': informe um número válido.')
  }
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(label + ': informe um valor dentro da faixa permitida.')
  }
  return parsed
}

export function finite(value: number, label: string) {
  if (!Number.isFinite(value)) throw new Error(label + ': valor fora da faixa numérica.')
  return value
}

export function positive(value: number, label: string) {
  if (finite(value, label) <= 0) throw new Error(label + ': informe um valor maior que zero.')
  return value
}

export function nonnegative(value: number, label: string) {
  if (finite(value, label) < 0) throw new Error(label + ': informe um valor não negativo.')
  return value
}

export function speciesNames(names: string[], max = 12) {
  if (names.length < 1 || names.length > max) throw new Error('Informe de 1 a ' + max + ' espécies.')
  const normalized = names.map((name) => name.trim())
  if (normalized.some((name) => !/^[\p{L}\p{N}][\p{L}\p{N}()[\]^_+−-]{0,15}$/u.test(name))) {
    throw new Error('Use nomes de até 16 caracteres, como A, NO2 ou H+.')
  }
  if (new Set(normalized).size !== names.length) throw new Error('Use um nome distinto para cada espécie.')
  return normalized
}
