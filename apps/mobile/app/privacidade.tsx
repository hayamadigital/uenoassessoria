import policy from '@ueno/utils/privacy-policy.json'
import { Text, View } from 'react-native'
import { DataScreen, styles } from '@/components/DataScreen'

export default function Privacy() {
  return <DataScreen back title="Política de privacidade">
    <Text style={styles.text}>{policy.organization} · Atualizada em {policy.updatedAt}</Text>
    {policy.sections.map(({title, body}) => <View style={styles.card} key={title}><Text style={styles.heading}>{title}</Text><Text style={styles.text}>{body}</Text></View>)}
  </DataScreen>
}
