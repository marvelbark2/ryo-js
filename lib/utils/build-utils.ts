class RandomStringGenerator {
    private static instance: RandomStringGenerator;

    private static value: string = '';

    private constructor() {
        RandomStringGenerator.initValue();
    }

    public static getInstance(): RandomStringGenerator {
        if (!RandomStringGenerator.instance) {
            RandomStringGenerator.instance = new RandomStringGenerator();
        }
        return RandomStringGenerator.instance;
    }


    private static initValue(): void {
        const digits = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)).join('');
        const characters = 'abcdefghijklmnopqrstuvwxyz';
        const character = characters.charAt(Math.floor(Math.random() * characters.length));

        RandomStringGenerator.value = digits + character;
    }

    public generateRandomString(): string {
        return RandomStringGenerator.value;
    }
}

const randomStringGenerator = RandomStringGenerator.getInstance();

export function getBuildVersion(): string {
    return randomStringGenerator.generateRandomString();
}