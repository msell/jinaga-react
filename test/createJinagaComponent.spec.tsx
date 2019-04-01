import { Jinaga, JinagaBrowser } from "jinaga";
import * as React from "react";
import { cleanup, render } from "react-testing-library";
import { jinagaContainer } from "../src";
import { applicationMapping } from "./components/Application";
import { Item, Name, Root, ItemDeleted } from "./model";

describe("Specification For", () => {
    var j: Jinaga;
    var root: Root;
    var Application: React.ComponentType<{ fact: Root | null, greeting: string }>;

    beforeEach(async () => {
        j = JinagaBrowser.create({});
        root = await j.fact(new Root("home"));
        Application = jinagaContainer(j, applicationMapping);
    });

    afterEach(cleanup);

    it("should pass through properties", async () => {
        const { findByTestId } = render(<Application fact={root} greeting="Shalom" />);
        const identifier = await findByTestId("greeting") as HTMLElement;
        expect(identifier.innerHTML).toBe("Shalom");
    });

    it("should resolve fields", async () => {
        const identifier = await whenGetIdentifier();
        expect(identifier).toBe("home");
    });

    it("should resolve properties", async () => {
        await j.fact(new Name(new Root("home"), "Home", []));

        const name = await whenGetName();
        expect(name).toBe("Home");
    });

    it("should replace previous values", async () => {
        const root = await j.fact(new Root("home"));
        const first = await j.fact(new Name(root, "Home", []));
        await j.fact(new Name(root, "Modified", [ first ]));

        const name = await whenGetName();
        expect(name).toBe("Modified");
    });

    it("should take second value in a conflict", async () => {
        const root = await j.fact(new Root("home"));
        await j.fact(new Name(root, "Home", []));
        await j.fact(new Name(root, "Modified", []));

        const name = await whenGetName();
        expect(name).toBe("Modified");
    });
    
    it("should resolve mutable", async () => {
        await j.fact(new Name(new Root("home"), "Home", []));

        const nameWithConflicts = await whenGetNameWithConflicts();
        expect(nameWithConflicts).toBe("Home");
    });

    it("should replace previous value in mutable", async () => {
        const root = await j.fact(new Root("home"));
        const first = await j.fact(new Name(root, "Home", []));
        await j.fact(new Name(root, "Modified", [ first ]));

        const nameWithConflicts = await whenGetNameWithConflicts();
        expect(nameWithConflicts).toBe("Modified");
    });

    it("should apply resolver in a conflict", async () => {
        const root = await j.fact(new Root("home"));
        await j.fact(new Name(root, "Home", []));
        await j.fact(new Name(root, "Modified", []));

        const nameWithConflicts = await whenGetNameWithConflicts();
        expect(nameWithConflicts).toBe("Home, Modified");
    });

    it("should add to a collection", async () => {
        const item = await j.fact(new Item(new Root("home"), new Date()));

        const itemHash = await whenGetTestValue("item_hash");
        expect(itemHash).toBe(j.hash(item));
    });

    it("should remove from a collection", async () => {
        const item = await j.fact(new Item(new Root("home"), new Date()));
        await j.fact(new ItemDeleted(item));

        const { queryByTestId } = render(<Application fact={root} greeting="Are you there?" />);
        const element = await queryByTestId("item_hash");
        expect(element).toBe(null);
    });
    
    // it("should resolve sub items", async () => {
    //     const item = await j.fact(new Item(new Root("home"), new Date()));
    //     await j.fact(new SubItem(item, new Date()));
    //     expect(application.state.items[0].subItems.length).to.equal(1);
    // });

    // it("should resolve fields of sub items", async () => {
    //     const item = await j.fact(new Item(new Root("home"), new Date()));
    //     const subItem = await j.fact(new SubItem(item, new Date()));
    //     expect(application.state.items[0].subItems[0].createdAt).to.equal(subItem.cretedAt);
    // });

    // it("should resolve sub sub items", async () => {
    //     const item = await j.fact(new Item(new Root("home"), new Date()));
    //     const subItem = await j.fact(new SubItem(item, new Date()));
    //     await j.fact(new SubSubItem(subItem, "reindeer flotilla"));
    //     expect(application.state.items[0].subItems[0].subSubItems[0].id).to.equal("reindeer flotilla");
    // });

    async function whenGetIdentifier() {
        return await whenGetTestValue("identifier");
    }

    async function whenGetName() {
        return await whenGetTestValue("name");
    }

    async function whenGetNameWithConflicts() {
        return await whenGetTestValue("nameWithConflicts");
    }

    async function whenGetTestValue(testId: string) {
        const { findByTestId } = render(<Application fact={root} greeting="Hello" />);
        const identifier = await findByTestId(testId) as HTMLElement;
        return identifier.innerHTML;
    }
});