import { Jinaga as j } from "jinaga";
import * as React from "react";
import { field } from "../../src/specifications/field";
import { property } from "../../src/specifications/property";
import { specificationFor } from "../../src/specifications/specificationFor";
import { Name, Root } from "../model";
import { mutable } from "../../src/specifications/mutable";

const applicationSpec = specificationFor(Root, {
    identifier: field(r => r.identifier),
    name: property(j.for(Name.inRoot), n => n.value, ""),
    nameWithConflicts: mutable(j.for(Name.inRoot), names => names
        .map(n => n.value)
        .join(", ")
    )
});

interface ApplicationExtraProps {
    greeting: string;
}

export const applicationMapping = applicationSpec<ApplicationExtraProps>(({ identifier, name, nameWithConflicts, greeting }) => (
    <>
        <p data-testid="greeting">{greeting}</p>
        <p data-testid="identifier">{identifier}</p>
        <p data-testid="name">{name}</p>
        <p data-testid="nameWithConflicts">{nameWithConflicts.value}</p>
    </>
))