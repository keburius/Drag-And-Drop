// Project Type
enum ProjectStatus {
	Active,
	Finished,
}

class Project {
	constructor(public id: string, public title: string, public description: string, public people: number, public status: ProjectStatus) {}
}

// Project State Managment
type Listener<T> = (items: T[]) => void;

class State<T> {
	protected listeners: Listener<T>[] = [];
	addListener(listenerFn: Listener<T>) {
		this.listeners.push(listenerFn);
	}
}

class ProjectState extends State<Project> {
	private projects: Project[] = [];
	private static instance: ProjectState;

	private constructor() {
		super();
	}

	static getInstance() {
		if (this.instance) {
			return this.instance;
		}
		this.instance = new ProjectState();
		return this.instance;
	}

	addProject(title: string, description: string, numOfpeople: number) {
		const newProject = new Project(Math.floor(10000 + Math.random() * 1000).toString(), title, description, numOfpeople, ProjectStatus.Active);
		this.projects.push(newProject);
		for (const listenerFn of this.listeners) {
			listenerFn(this.projects.slice());
		}
	}
}

const projectState = ProjectState.getInstance();

// Validation
interface Validatable {
	value: string | number;
	required?: boolean;
	minLength?: number;
	maxLength?: number;
	min?: number;
	max?: number;
}
function validate(validatableInput: Validatable) {
	let isValid = true;
	if (validatableInput.required) {
		isValid = isValid && validatableInput.value.toString().trim().length !== 0;
	}
	if (validatableInput.minLength != null && typeof validatableInput.value === 'string') {
		isValid = isValid && validatableInput.value.length >= validatableInput.minLength;
	}
	if (validatableInput.maxLength != null && typeof validatableInput.value === 'string') {
		isValid = isValid && validatableInput.value.length <= validatableInput.maxLength;
	}
	if (validatableInput.min != null && typeof validatableInput.value === 'number') {
		isValid = isValid && validatableInput.value >= validatableInput.min;
	}
	if (validatableInput.max != null && typeof validatableInput.value === 'number') {
		isValid = isValid && validatableInput.value <= validatableInput.max;
	}
	return isValid;
}
// AutoBind Decorator
function autobind(_: any, _2: string, descriptor: PropertyDescriptor) {
	const originalMethod = descriptor.value;
	const adjDescriptor: PropertyDescriptor = {
		configurable: true,
		get() {
			const boundFn = originalMethod.bind(this);
			return boundFn;
		},
	};
	return adjDescriptor;
}
// Component Base Class
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
	templateElement: HTMLTemplateElement;
	hostElement: T;
	element: U;

	constructor(templateId: string, hostElemendId: string, insertAtStart: boolean, newElementId?: string) {
		this.templateElement = document.getElementById(templateId)! as HTMLTemplateElement;
		this.hostElement = document.getElementById(hostElemendId)! as T;

		const importedNode = document.importNode(this.templateElement.content, true);
		this.element = importedNode.firstElementChild as U;
		if (newElementId) {
			this.element.id = newElementId;
		}
		this.attach(insertAtStart);
	}
	private attach(insertAtBeginning: boolean) {
		this.hostElement.insertAdjacentElement(insertAtBeginning ? 'afterbegin' : 'beforebegin', this.element);
	}
	abstract configure?(): void;
	abstract renderContent(): void;
}
// ProjectItem Class
class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> {
	private project: Project;

	get persons() {
		if (this.project.people === 1) {
			return '1 person assigned!';
		} else {
			return `${this.project.people} persons assigned!`;
		}
	}
	constructor(hostId: string, project: Project) {
		super('single-project', hostId, true, project.id);
		this.project = project;

		this.configure();
		this.renderContent();
	}

	configure() {}
	renderContent() {
		this.element.querySelector('h2')!.textContent = this.project.title;
		this.element.querySelector('h3')!.textContent = this.persons;
		this.element.querySelector('p')!.textContent = this.project.description;
	}
}

// ProjectList Class
class ProjectList extends Component<HTMLDivElement, HTMLElement> {
	assinedProjects: Project[];

	constructor(private type: 'active' | 'finished') {
		super('project-list', 'app', false, `${type}-projects`);
		this.assinedProjects = [];

		this.configure();
		this.renderContent();
	}

	configure() {
		projectState.addListener((projects: Project[]) => {
			const relevantProjects = projects.filter((prj) => {
				if (this.type === 'active') {
					return prj.status === ProjectStatus.Active;
				}
				return prj.status === ProjectStatus.Finished;
			});
			this.assinedProjects = relevantProjects;
			this.renderProjects();
		});
	}

	renderContent() {
		const listId = `${this.type}-projects-list`;
		this.element.querySelector('ul')!.id = listId;
		this.element.querySelector('h2')!.textContent = this.type.toUpperCase() + ' Projects';
	}
	private renderProjects() {
		const listEl = document.getElementById(`${this.type}-projects-list`)! as HTMLUListElement;
		listEl.innerHTML = '';
		console.log(this.element.querySelector('ul'));
		for (const prjItem of this.assinedProjects) {
			new ProjectItem(this.element.querySelector('ul')!.id, prjItem);
		}
	}
}

// Project Input Class
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
	titleInputElement: HTMLInputElement;
	peopleInputElement: HTMLInputElement;
	descriptionInputElement: HTMLInputElement;

	constructor() {
		super('project-input', 'app', false, 'user-input');

		this.titleInputElement = this.element.querySelector('#title') as HTMLInputElement;
		this.descriptionInputElement = this.element.querySelector('#description') as HTMLInputElement;
		this.peopleInputElement = this.element.querySelector('#people') as HTMLInputElement;

		this.configure();
	}

	configure() {
		this.element.addEventListener('submit', this.submitHandler);
	}
	renderContent() {}

	private clearInputes() {
		this.titleInputElement.value = '';
		this.descriptionInputElement.value = '';
		this.peopleInputElement.value = '';
	}

	private gatherUserInput(): [string, string, number] | void {
		const enteredTitle = this.titleInputElement.value;
		const enteredDescription = this.descriptionInputElement.value;
		const enteredPeople = this.peopleInputElement.value;

		const titleValidatable: Validatable = {
			value: enteredTitle,
			required: true,
		};

		const describtionValidatable: Validatable = {
			value: enteredDescription,
			required: true,
			minLength: 6,
		};

		const peopleValidatable: Validatable = {
			value: +enteredPeople,
			required: true,
			min: 1,
			max: 5,
		};

		if (!validate(titleValidatable) || !validate(describtionValidatable) || !validate(peopleValidatable)) {
			alert('Invalid Input , Please try Again !!!');
			return;
		} else {
			return [enteredTitle, enteredDescription, +enteredPeople];
		}
	}

	@autobind
	private submitHandler(event: Event) {
		event.preventDefault();
		const userInput = this.gatherUserInput();
		if (Array.isArray(userInput)) {
			const [title, desc, people] = userInput;
			projectState.addProject(title, desc, people);
			this.clearInputes();
		}
	}
}

const projInput = new ProjectInput();
const activeProjList = new ProjectList('active');
const finishedProjList = new ProjectList('finished');
