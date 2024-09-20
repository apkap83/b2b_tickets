import Image from 'next/image';
import { united_group_member } from '@b2b-tickets/assets';
import { NovaLogoSVG } from '@b2b-tickets/assets';

export const Footer: React.FC = () => {
  return (
    <footer
      className={`flex justify-center 
      items-center bg-black text-white
      text-center text-sm py-2 z-10 fixed w-full bottom-0`}
    >
      <div
        style={{
          width: '450px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          fontFamily: 'Manrope, sans-serif',
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
          NOVA&nbsp;
          {new Date().getFullYear()}
        </div>

        <Image
          priority
          src={united_group_member}
          alt={'United Group Logo'}
          height={24}
        />
      </div>
    </footer>
  );
};
