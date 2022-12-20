import React, { useContext } from "react";

const last_selected = localStorage.getItem('@last_selected');
export const ProductContext = React.createContext([
  {
    selected_image: null,
    selected_product: {
      item_title: '',
      is_most_wanted: false,
      item_url: '',
      item_price: '',
      item_description: '',
    },
    selected_list_id: last_selected || 'favourite',
    isAuthencated: false,
    product: null,
    authorized_token: '',
    categories: [],
  },
  null
]);

export const useProductContext = () => {
  const products = useContext(ProductContext);
  if (!products[1]) {
      throw new Error('useProductContext can\'t be used outside a ProductContext.')
  }
  return products;
}