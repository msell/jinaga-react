import { expect } from "chai";
import { Jinaga, JinagaBrowser } from "jinaga";
import { collection, field, StateManager } from "../src/index";

class Root {
    static Type = 'Application.Root';
    type = Root.Type;

    constructor(
        public identifier: string
    ) { }
}

class Item {
    static Type = 'Application.Item';
    type = Item.Type;

    constructor(
        public root: Root,
        public createdAt: Date | string
    ) { }

    static inRoot(r: Root) {
        return Jinaga.match(<Item>{
            type: Item.Type,
            root: r
        }).suchThat(Jinaga.not(Item.isDeleted));
    }

    static isDeleted(i: Item) {
        return Jinaga.exists(<ItemDeleted>{
            type: ItemDeleted.Type,
            item: i
        });
    }
}

class ItemDeleted {
    static Type = 'Application.Item.Deleted';
    type = ItemDeleted.Type;

    constructor(
        public item: Item
    ) { }
}

class SubItem {
    static Type = 'Application.SubItem';
    type = SubItem.Type;

    constructor(
        public item: Item,
        public cretedAt: Date | string
    ) { }

    static inItem(i: Item) {
        return Jinaga.match(<SubItem> {
            type: SubItem.Type,
            item: i
        });
    }
}

class SubSubItem {
    static Type = 'Application.SubSubItem';
    type = SubSubItem.Type;

    constructor(
        public subItem: SubItem,
        public id: string
    ) { }

    static inSubItem(si: SubItem) {
        return Jinaga.match(<SubSubItem>{
            type: SubSubItem.Type,
            subItem: si
        });
    }
}

interface SubSubItemViewModel {
    id: string;
}

interface SubItemViewModel {
    createdAt: Date | string;
    subSubItems: SubSubItemViewModel[];
}

interface ItemViewModel {
    key: string;
    fact: Item;
    subItems: SubItemViewModel[]
}

interface ApplicationState {
    items: ItemViewModel[];
}

class Application {
    state: ApplicationState;
    private watch?: StateManager;

    constructor() {
        this.state = {
            items: []
        };
    }

    setState(state: ApplicationState) {
        this.state = state;
    }

    componentDidMount(j: Jinaga) {
        const root = new Root('home');
        this.watch = StateManager.forComponent(this, root, j, [
            collection('items', Jinaga.for(Item.inRoot), i => i.key, [
                field('key', i => j.hash(i)),
                field('fact', i => i),
                collection('subItems', Jinaga.for(SubItem.inItem), s => s.createdAt, [
                    field('createdAt', s => s.cretedAt),
                    collection('subSubItems', Jinaga.for(SubSubItem.inSubItem), ssi => ssi.id, [
                        field('id', ssi => ssi.id)
                    ])
                ])
            ])
        ]);
    }

    componentWillUnmount() {
        if (this.watch) {
            this.watch.stop();
        }
    }
}

describe('Application State', () => {
    var j: Jinaga;
    var application: Application;

    beforeEach(() => {
        j = JinagaBrowser.create({});
        application = new Application();
        application.componentDidMount(j);
    });

    afterEach(() => {
        application.componentWillUnmount();
    })

    it('should watch', () => {
        expect(application.state).to.not.be.null;
    });

    it('should add to a collection', async () => {
        await j.fact(new Item(new Root('home'), new Date()));
        expect(application.state.items.length).to.equal(1);
    });

    it('should resolve the fact', async () => {
        await j.fact(new Item(new Root('home'), new Date()));
        expect(application.state.items[0].fact.type).to.equal(Item.Type);
    });

    it('should resolve the key', async () => {
        const item = await j.fact(new Item(new Root('home'), new Date()));
        expect(application.state.items[0].key).to.equal(j.hash(item));
    });

    it('should remove from a collection', async () => {
        const item = await j.fact(new Item(new Root('home'), new Date()));
        await j.fact(new ItemDeleted(item));
        expect(application.state.items.length).to.equal(0);
    });

    it('should resolve sub items', async () => {
        const item = await j.fact(new Item(new Root('home'), new Date()));
        await j.fact(new SubItem(item, new Date()));
        expect(application.state.items[0].subItems.length).to.equal(1);
    });

    it('should resolve fields of sub items', async () => {
        const item = await j.fact(new Item(new Root('home'), new Date()));
        const subItem = await j.fact(new SubItem(item, new Date()));
        expect(application.state.items[0].subItems[0].createdAt).to.equal(subItem.cretedAt);
    });

    it('should result sub sub items', async () => {
        const item = await j.fact(new Item(new Root('home'), new Date()));
        const subItem = await j.fact(new SubItem(item, new Date()));
        await j.fact(new SubSubItem(subItem, 'reindeer flotilla'));
        expect(application.state.items[0].subItems[0].subSubItems[0].id).to.equal('reindeer flotilla');
    });
});