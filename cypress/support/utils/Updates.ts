import { IPaginationResult } from '@models/types';
import { IUpdateRawQueryList } from '@models/Update.model';

const { _ } = Cypress;
export function getUpdateFromEl(
  $el: JQuery<Element>,
  data: IPaginationResult<IUpdateRawQueryList>,
): IUpdateRawQueryList {
  const updateId = $el.data('testid').split('update-item-')[1];
  const update = _.find(data.results, _update => {
    return _update.id === updateId;
  });

  return update as IUpdateRawQueryList;
}

export function imageLoaded($img: JQuery<HTMLImageElement>, src: string) {
  expect($img[0].src).to.equal(src);
  expect($img[0].naturalWidth, 'image has natural width').to.be.greaterThan(0);
}
