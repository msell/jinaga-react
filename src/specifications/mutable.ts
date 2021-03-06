import { Jinaga, Preposition } from "jinaga";
import { setFieldValue, setStoreData, Store, StorePath } from "../store/store";
import { BeginWatch, FieldDeclaration, Mutator, Transformer, WatchContext } from "./declaration";

export interface Mutable<Fact, T> {
    candidates: { [hash: string]: Fact };
    value: T;
}

/**
 * Produce an array of facts from a set of candidates.
 * Use this function to change the value of a mutable property.
 * First, set up the property in the view model with `mutable`.
 * Then, freeze the property while the user is editing the value.
 * Finally, when they finish, create a new fact recording the new value and `prior(candidates)`.
 * 
 * @param mutable A mutable field of the view model, as specified with `mutable`
 */
export function prior<Fact, T>(mutable: Mutable<Fact, T>) {
    return Object
        .keys(mutable.candidates)
        .map(key => mutable.candidates[key]);
}

/**
 * Set up a view model field that represents a property that will eventually be changed.
 * The field will be of type `Mutable`, which has an array of `candidates` and a single `value`.
 * The property follows the pattern of a successor having a value and an array of prior properties.
 * Provide a preposition that uses `suchThat` to exclude facts that appear in a prior array.
 * This specification will pass all matching facts to the resolver.
 * If a conflict occurs, the array passed to the resolver will have more than one element.
 * 
 * To mutate the value, use `j.fact` to record a new fact having the new value and an
 * array listing all of the candidates.
 * Use the function `prior(candidates)` to produce the array.
 * 
 * @param preposition A Jinaga preposition using `j.for`
 * @param resolver A function that determines a single value given an array of candidate facts
 */
export function mutable<M, U, T>(
    preposition: Preposition<M, U>,
    resolver: (candidates: U[]) => T
) : FieldDeclaration<M, Mutable<U, T>> {
    function valueOf(candidates: { [x: string]: U; }) {
        return resolver(Object
            .keys(candidates)
            .map(key => candidates[key]));
    }

    function addCandidate(hash: string, child: U): Transformer<Mutable<U, T>> {
        return oldMutable => {
            const newCandidates = { ...oldMutable.candidates, [hash]: child };
            const newValue = valueOf(newCandidates);
            const newMutable = {
                candidates: newCandidates,
                value: newValue
            };
            return newMutable;
        }
    }

    function removeCandidate(hash: string): Transformer<Mutable<U, T>> {
        return oldMutable => {
            const { [hash]: fact, ...newCandidates } = oldMutable.candidates;
            const newValue = valueOf(newCandidates);
            const newMutable = {
                candidates: newCandidates,
                value: newValue
            };
            return newMutable;
        }
    }

    function createFieldWatches(
        beginWatch: BeginWatch<M>,
        mutator: Mutator<Store>,
        fieldName: string
    ) {
        function resultAdded(path: StorePath, child: U): WatchContext {
            const hash = Jinaga.hash(child);
            mutator(setStoreData(path, setFieldValue(fieldName, addCandidate(hash, child))));
            return {
                resultRemoved: () => {
                    mutator(setStoreData(path, setFieldValue(fieldName, removeCandidate(hash))));
                },
                storePath: path
            };
        }

        const watch = beginWatch(preposition, resultAdded);
        return [ watch ];
    }

    return {
        initialFieldState: () => ({
            candidates: {},
            value: resolver([])
        }),
        createFieldWatches
    }
}