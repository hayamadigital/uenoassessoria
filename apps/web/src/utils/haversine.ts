/**
 * Haversine distance calculation and greedy route distribution algorithm.
 * All calculations are client-side — no API calls, no cost.
 */

/** Returns distance in kilometers between two lat/lng points. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export interface VeiculoParaDistribuicao {
  /** Unique local id for the vehicle */
  id: string
  lat: number
  lng: number
  capacidade: number
}

export interface ClienteParaDistribuicao {
  id: string
  lat: number
  lng: number
}

/**
 * Greedy distribution: assigns clients to vehicles based on proximity to each
 * vehicle's starting point, respecting capacity limits.
 *
 * Strategy: sort vehicles by smallest capacity first so tighter constraints
 * are filled first. For each vehicle, find the N closest unassigned clients.
 *
 * @returns Record mapping vehicleId → array of clientIds
 */
export function recomendarDistribuicao(
  veiculos: VeiculoParaDistribuicao[],
  clientes: ClienteParaDistribuicao[],
): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  const assigned = new Set<string>()

  // Sort vehicles: smallest capacity first (fill tight constraints first)
  const sorted = [...veiculos].sort((a, b) => a.capacidade - b.capacidade)

  for (const veiculo of sorted) {
    result[veiculo.id] = []

    // Get unassigned clients with distances to this vehicle
    const unassigned = clientes
      .filter((c) => !assigned.has(c.id))
      .map((c) => ({
        id: c.id,
        dist: haversineKm(veiculo.lat, veiculo.lng, c.lat, c.lng),
      }))
      .sort((a, b) => a.dist - b.dist)

    // Assign up to capacity
    const toAssign = unassigned.slice(0, veiculo.capacidade)
    for (const c of toAssign) {
      result[veiculo.id]!.push(c.id)
      assigned.add(c.id)
    }
  }

  return result
}
