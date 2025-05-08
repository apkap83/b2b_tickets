import Image from 'next/image';
import { united_group_member } from '@b2b-tickets/assets';

export const Footer: React.FC = () => {
  return (
    <footer
      className={`flex justify-center 
      items-center bg-black text-white
      text-center text-sm py-2 z-10 fixed w-full bottom-0
      border-gray-600 
      border-2
      `}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          fontFamily: 'Manrope, sans-serif',
        }}
      >
        <div className="flex flex-col text-gray-300 m-auto">
          <p>
            &copy;&nbsp; NOVA&nbsp;Platinum Support&nbsp;
            {new Date().getFullYear()}&nbsp;
          </p>
          <p className="text-xs">version: {process.env.version}</p>
        </div>
        <div className="mr-3">
          <Image
            priority
            src={united_group_member}
            alt={'United Group Logo'}
            height={29}
            width={155}
            style={{
              objectFit: 'contain',
              justifySelf: 'flex-end',
              filter: 'brightness(0.9)',
            }}
          />
        </div>
      </div>
    </footer>
  );
};
