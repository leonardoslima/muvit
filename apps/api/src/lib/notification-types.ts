export type PushMessage = {
  token: string;
  title: string;
  body: string;
};

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
};
