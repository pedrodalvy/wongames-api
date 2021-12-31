import React from 'react';
import Wrapper, { A } from './Wrapper';

function LeftMenuFooter() {
  return (
    <Wrapper>
      <div className="poweredBy">
        <span>Mantido por </span>
        <A key="website" href="https://github.com/pedrodalvy" target="_blank" rel="noopener noreferrer">
          Pedro Dalvy
        </A>
      </div>
    </Wrapper>
  );
}

export default LeftMenuFooter;
