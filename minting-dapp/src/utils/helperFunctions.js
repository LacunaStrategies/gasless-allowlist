export const shortAddress = (address, fromStart=3, fromEnd=-4) => {
    const str = address.slice(0, fromStart) + '...' + address.slice(fromEnd)
    return str
}