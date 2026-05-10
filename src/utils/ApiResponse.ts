class ApiResponse<T = unknown> {
  public statusCode: number
  public data: T;
  public success: boolean;
  public message: string;

  constructor ( statusCode:number, data: T, message: string ) 
  {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
    
  }
}

export { ApiResponse }