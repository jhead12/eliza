import axios from 'axios';

export function createAxiosClient(baseURL: string, token: string) {
    return axios.create({
        baseURL,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
}
