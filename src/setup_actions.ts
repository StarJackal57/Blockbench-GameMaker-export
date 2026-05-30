export function setupActions(): BarItem[] {

    const actions: BarItem[] = [];

    let test_action = new Action('my_test_action', {
        name: 'My Test Action',
        icon: 'help',
        click() {
            Blockbench.showQuickMessage('Hello World!');
        }
    })

    actions.push(test_action);

    return actions;
}
