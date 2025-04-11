export class FreqTable {
    private qubits : number = 4
    rows : number = 2**this.qubits
    private pairs : Pair[] = []

    setFreq(index : number, freq : number) {
        let pair = this.getPair(index)
        if (pair) {
            if (freq==0) {
                this.pairs = this.pairs.filter(p => p !== pair);
                return
            }
            pair.freq = freq
        } else {
            let pair = new Pair()
            pair.index = index
            pair.freq = freq
            this.pairs.push(pair)
        }
    }

    getRelativeFreq(rowIndex : number, decimals : number) {
        let pair = this.getPair(rowIndex)
        if (!pair)
            return 0
        return ((100*pair.freq)/this.getShots()).toFixed(decimals)
    }

    setQubits(qubits : number) {
        let rowsPre = this.rows

        this.qubits = qubits
        this.rows = 2**this.qubits

        if (this.rows<rowsPre) {
            this.pairs = this.pairs.filter(pair => pair.index < this.rows);
        }
    }

    getShots(): number {
        return this.pairs.reduce((sum, pair) => sum + pair.freq, 0);
    }

    getPair(index : number) : Pair | undefined {
        let pairs = this.pairs.filter(pair => pair.index==index)
        if (!pairs)
            return undefined
        return pairs.at(0)
    }

    getFreq(index : number) : number {
        let pairs = this.pairs.filter(pair => pair.index==index)
        if (pairs.length==0)
            return 0
        return pairs.at(0)!.freq
    }
}

export class Pair {
    index : number = 0
    freq : number = 0
}