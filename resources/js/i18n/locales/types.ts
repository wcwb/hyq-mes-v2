// TypeScript 接口定义，确保所有语言包结构一致
export interface LocaleMessages {
    greeting: string;
    menu: {
        home: string;
        about: string;
        products: string;
        contact: string;
        dashboard: string;
        repository: string;
        documentation: string;
    };
    button: {
        submit: string;
        cancel: string;
        save: string;
        delete: string;
        edit: string;
        login: string;
        logout: string;
    };
    form: {
        name: string;
        email: string;
        password: string;
        confirmPassword: string;
        login: string;
        rememberMe: string;
        forgotPassword: string;
    };
    message: {
        success: string;
        error: string;
        loading: string;
    };
    page: {
        dashboard: {
            title: string;
        };
        auth: {
            login: {
                title: string;
                description: string;
                pageTitle: string;
                placeholder: {
                    login: string;
                    password: string;
                };
            };
        };
        settings: {
            appearance: {
                title: string;
                description: string;
                pageTitle: string;
            };
        };
    };
    navigation: {
        menu: string;
    };
    common: {
        search: string;
    };
} 