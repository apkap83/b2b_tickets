import Image from 'next/image';
import { united_group_member } from '@b2b-tickets/assets';

export const Footer: React.FC = () => {
  return (
    <footer
      className={`flex justify-center 
      items-center bg-black text-white
      text-center text-sm py-2 z-10 fixed bottom-0
      w-full
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
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          &copy;&nbsp;
          {/* <NovaLogoSVG
            style={{
              height: '30px',
              width: '70px',
              color: '#ffffff',
              fill: 'white',
            }}
          />{' '} */}
          NOVA&nbsp;2025
        </div>

        <Image
          priority
          src={united_group_member}
          alt={'United Group Logo'}
          height={29}
          width={155}
          style={{
            objectFit: 'contain',
          }}
        />
        <div className="text-xs text-gray-500 absolute right-7 hidden md:block">
          Ver. {process.env.version}
        </div>
      </div>
    </footer>
  );
};
