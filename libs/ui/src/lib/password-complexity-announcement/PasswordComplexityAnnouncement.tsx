import { config } from '@b2b-tickets/config';

export function PasswordComplexityAnnouncement() {
  return (
    <div className="text-xs border border-gray-400 p-2">
      <p className="text-center mb-2">Password Complexity Rules</p>
      <ol className="font-normal">
        <li>{`At least ${config.MinimumPasswordCharacters} characters long`}</li>
        <li>At least one uppercase letter</li>
        <li>At least one lowercase letter</li>
        <li>At least one number</li>
        <li>
          At least one special character [&#33; &#64; &#35; &#36; &#37; &#94;
          &#38; &#42; &#40; &#41; &#44; &#46; &#63; &#58; &#34; &#123; &#125;
          &#124; &#60; &#62;]
        </li>
      </ol>
    </div>
  );
}
