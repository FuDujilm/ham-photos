export interface ApiError {
  error: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username: string;
}

export interface InitStatusResponse {
  initialized: boolean;
}

export interface InitRequest {
  username: string;
  password: string;
}

export interface InitResponse {
  token: string;
  username: string;
}
