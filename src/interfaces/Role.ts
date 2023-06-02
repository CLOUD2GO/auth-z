interface Role {
    id: string;
    name: string;
    description?: string;
    permissions: string[];
    context: 'global' | 'local';
}

export default Role;