export class Individual {
    index : number = 0
    gotFrequencies : any[] = []
    error : any[] = []
    fitness : any[] = []
    length : any[] = []
    selectionProbability : number = 0
    selected : boolean[] = []

    // constructor(index : number, numberOfFitnessers : number) {
    constructor(index : number) {
        this.index = index
        this.gotFrequencies.push([])
        this.error.push([])
        this.fitness.push([])
        this.length.push([])
        
    }
}